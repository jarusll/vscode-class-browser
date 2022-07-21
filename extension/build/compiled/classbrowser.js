var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.49.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* webviews/components/ClassBrowser.svelte generated by Svelte v3.49.0 */
    const file = "webviews/components/ClassBrowser.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	return child_ctx;
    }

    // (117:0) {#each TypeOptions as option}
    function create_each_block_1(ctx) {
    	let div;
    	let input;
    	let t0;
    	let label;
    	let t1_value = /*option*/ ctx[14].label + "";
    	let t1;
    	let t2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(input, "type", "radio");
    			attr_dev(input, "id", /*option*/ ctx[14].value);
    			input.__value = /*option*/ ctx[14].value;
    			input.value = input.__value;
    			attr_dev(input, "class", "input-type svelte-1fejiq4");
    			/*$$binding_groups*/ ctx[9][0].push(input);
    			add_location(input, file, 118, 8, 2993);
    			attr_dev(label, "for", /*option*/ ctx[14].value);
    			add_location(label, file, 120, 8, 3118);
    			attr_dev(div, "class", "type svelte-1fejiq4");
    			add_location(div, file, 117, 4, 2966);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			input.checked = input.__value === /*searchType*/ ctx[1];
    			append_dev(div, t0);
    			append_dev(div, label);
    			append_dev(label, t1);
    			append_dev(div, t2);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*input_change_handler*/ ctx[8]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*searchType*/ 2) {
    				input.checked = input.__value === /*searchType*/ ctx[1];
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*$$binding_groups*/ ctx[9][0].splice(/*$$binding_groups*/ ctx[9][0].indexOf(input), 1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(117:0) {#each TypeOptions as option}",
    		ctx
    	});

    	return block;
    }

    // (128:1) {#each searchResults as classType}
    function create_each_block(ctx) {
    	let li;
    	let button;
    	let span0;
    	let t0_value = /*classType*/ ctx[11].name + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2_value = (/*classType*/ ctx[11]?.containerName || "") + "";
    	let t2;
    	let button_title_value;
    	let t3;
    	let li_style_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[10](/*classType*/ ctx[11]);
    	}

    	const block = {
    		c: function create() {
    			li = element("li");
    			button = element("button");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			attr_dev(span0, "class", "class svelte-1fejiq4");
    			add_location(span0, file, 140, 16, 3769);
    			attr_dev(span1, "class", "container svelte-1fejiq4");
    			add_location(span1, file, 141, 16, 3829);
    			attr_dev(button, "class", "symbol svelte-1fejiq4");
    			attr_dev(button, "title", button_title_value = /*classType*/ ctx[11]?.kind.toString() + " " + /*classType*/ ctx[11]?.name);
    			add_location(button, file, 129, 12, 3351);
    			attr_dev(li, "style", li_style_value = `color: ${color(/*classType*/ ctx[11]?.kind.toString())};`);
    			attr_dev(li, "class", "svelte-1fejiq4");
    			add_location(li, file, 128, 2, 3279);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, button);
    			append_dev(button, span0);
    			append_dev(span0, t0);
    			append_dev(button, t1);
    			append_dev(button, span1);
    			append_dev(span1, t2);
    			append_dev(li, t3);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*searchResults*/ 1 && t0_value !== (t0_value = /*classType*/ ctx[11].name + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*searchResults*/ 1 && t2_value !== (t2_value = (/*classType*/ ctx[11]?.containerName || "") + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*searchResults*/ 1 && button_title_value !== (button_title_value = /*classType*/ ctx[11]?.kind.toString() + " " + /*classType*/ ctx[11]?.name)) {
    				attr_dev(button, "title", button_title_value);
    			}

    			if (dirty & /*searchResults*/ 1 && li_style_value !== (li_style_value = `color: ${color(/*classType*/ ctx[11]?.kind.toString())};`)) {
    				attr_dev(li, "style", li_style_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(128:1) {#each searchResults as classType}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div2;
    	let input;
    	let t0;
    	let div0;
    	let t1;
    	let div1;
    	let ul;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*TypeOptions*/ ctx[3];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*searchResults*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			input = element("input");
    			t0 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t1 = space();
    			div1 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(input, "class", "query-input");
    			add_location(input, file, 105, 0, 2604);
    			attr_dev(div0, "class", "types svelte-1fejiq4");
    			add_location(div0, file, 115, 0, 2912);
    			attr_dev(ul, "class", "class-browse svelte-1fejiq4");
    			add_location(ul, file, 126, 0, 3215);
    			attr_dev(div1, "class", "browse");
    			add_location(div1, file, 125, 0, 3194);
    			attr_dev(div2, "class", "main");
    			add_location(div2, file, 101, 0, 2506);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, input);
    			set_input_value(input, /*searchQuery*/ ctx[2]);
    			append_dev(div2, t0);
    			append_dev(div2, div0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div0, null);
    			}

    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[6]),
    					listen_dev(input, "input", /*input_handler*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*searchQuery*/ 4 && input.value !== /*searchQuery*/ ctx[2]) {
    				set_input_value(input, /*searchQuery*/ ctx[2]);
    			}

    			if (dirty & /*TypeOptions, searchType*/ 10) {
    				each_value_1 = /*TypeOptions*/ ctx[3];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*color, searchResults, post*/ 1) {
    				each_value = /*searchResults*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function post(message) {
    	tsvscode.postMessage(message);
    }

    function search(type, query) {
    	post({ type: "search-" + type, value: query });
    }

    function searchData(query) {
    	search("data", query);
    }

    function searchProcess(query) {
    	search("process", query);
    }

    function searchContainer(query) {
    	search("container", query);
    }

    function open(query) {
    	post({ type: "open", value: query });
    }

    function color(kind) {
    	switch (kind) {
    		case "Interface":
    			return "yellow";
    		case "Class":
    			return "aqua";
    		case "Struct":
    			return "orange";
    		case "Function":
    			return "green";
    		case "Namespace":
    		case "Module":
    		case "Package":
    			return "orange";
    		default:
    			return "white";
    	}
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ClassBrowser', slots, []);

    	const TypeOptions = [
    		{
    			value: "data",
    			label: "Data (Class/Interface/Struct/Enum)"
    		},
    		{
    			value: "process",
    			label: "Process (Function)"
    		},
    		{
    			value: "container",
    			label: "Container (Namespace/Package/Module)"
    		}
    	];

    	let searchResults = [];
    	let searchType = "data";
    	let searchQuery = "";

    	onMount(async () => {
    		// this is used to recieve message from sidebar provider
    		window.addEventListener("message", async event => {
    			const message = event.data;

    			switch (message.type) {
    				case "result":
    					{
    						$$invalidate(0, searchResults = message.value);
    						break;
    					}
    				case "partial-result":
    					{
    						// append
    						$$invalidate(0, searchResults = searchResults.concat(message.value));

    						// remove duplicates
    						$$invalidate(0, searchResults = searchResults.filter((value, index, self) => index === self.findIndex(t => t.name === value.name)));

    						break;
    					}
    			}
    		});
    	}); // setTimeout(() => searchAll(), 3000)
    	// this is used to send message to provider
    	// tsvscode.postMessage({ type: "get-token", value: undefined });
    	// searchQueryInput.focus()

    	function searchAll() {
    		post({
    			type: "search-all",
    			value: { type: searchType, query: "*" }
    		});
    	}

    	function searchSymbol(query) {
    		if (searchType === "data") searchData(query); else if (searchType === "process") searchProcess(query); else searchContainer(query);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ClassBrowser> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[]];

    	function input_input_handler() {
    		searchQuery = this.value;
    		$$invalidate(2, searchQuery);
    	}

    	const input_handler = () => {
    		if (searchQuery === "*") searchAll(); else searchSymbol(searchQuery);
    	};

    	function input_change_handler() {
    		searchType = this.__value;
    		$$invalidate(1, searchType);
    	}

    	const click_handler = classType => {
    		post({
    			type: "open",
    			value: {
    				path: classType?.location?.uri?.path,
    				position: classType?.location?.range[0]
    			}
    		});
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		TypeOptions,
    		searchResults,
    		searchType,
    		searchQuery,
    		post,
    		search,
    		searchData,
    		searchProcess,
    		searchContainer,
    		searchAll,
    		searchSymbol,
    		open,
    		color
    	});

    	$$self.$inject_state = $$props => {
    		if ('searchResults' in $$props) $$invalidate(0, searchResults = $$props.searchResults);
    		if ('searchType' in $$props) $$invalidate(1, searchType = $$props.searchType);
    		if ('searchQuery' in $$props) $$invalidate(2, searchQuery = $$props.searchQuery);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		searchResults,
    		searchType,
    		searchQuery,
    		TypeOptions,
    		searchAll,
    		searchSymbol,
    		input_input_handler,
    		input_handler,
    		input_change_handler,
    		$$binding_groups,
    		click_handler
    	];
    }

    class ClassBrowser extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ClassBrowser",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new ClassBrowser({
        target: document.body,
    });

    return app;

})();
//# sourceMappingURL=classbrowser.js.map
