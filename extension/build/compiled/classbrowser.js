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
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
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
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
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
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
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

    /* webviews/components/Radio.svelte generated by Svelte v3.49.0 */

    const file$1 = "webviews/components/Radio.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i].value;
    	child_ctx[10] = list[i].label;
    	return child_ctx;
    }

    // (26:4) {#each options as { value, label }}
    function create_each_block$1(ctx) {
    	let input;
    	let input_id_value;
    	let input_value_value;
    	let t0;
    	let label;
    	let t1_value = /*label*/ ctx[10] + "";
    	let t1;
    	let t2;
    	let label_for_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(input, "class", "sr-only svelte-ycsj0z");
    			attr_dev(input, "type", "radio");
    			attr_dev(input, "id", input_id_value = /*slugify*/ ctx[6](/*label*/ ctx[10]));
    			input.__value = input_value_value = /*value*/ ctx[9];
    			input.value = input.__value;
    			/*$$binding_groups*/ ctx[8][0].push(input);
    			add_location(input, file$1, 26, 8, 918);
    			attr_dev(label, "for", label_for_value = /*slugify*/ ctx[6](/*label*/ ctx[10]));
    			attr_dev(label, "class", "svelte-ycsj0z");
    			add_location(label, file$1, 33, 8, 1087);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			input.checked = input.__value === /*userSelected*/ ctx[0];
    			insert_dev(target, t0, anchor);
    			insert_dev(target, label, anchor);
    			append_dev(label, t1);
    			append_dev(label, t2);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*input_change_handler*/ ctx[7]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*options*/ 2 && input_id_value !== (input_id_value = /*slugify*/ ctx[6](/*label*/ ctx[10]))) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty & /*options*/ 2 && input_value_value !== (input_value_value = /*value*/ ctx[9])) {
    				prop_dev(input, "__value", input_value_value);
    				input.value = input.__value;
    			}

    			if (dirty & /*userSelected*/ 1) {
    				input.checked = input.__value === /*userSelected*/ ctx[0];
    			}

    			if (dirty & /*options*/ 2 && t1_value !== (t1_value = /*label*/ ctx[10] + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*options*/ 2 && label_for_value !== (label_for_value = /*slugify*/ ctx[6](/*label*/ ctx[10]))) {
    				attr_dev(label, "for", label_for_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			/*$$binding_groups*/ ctx[8][0].splice(/*$$binding_groups*/ ctx[8][0].indexOf(input), 1);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(label);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(26:4) {#each options as { value, label }}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let t1;
    	let each_value = /*options*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text(/*legend*/ ctx[2]);
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "legend svelte-ycsj0z");
    			attr_dev(div0, "id", `label-${/*uniqueID*/ ctx[5]}`);
    			add_location(div0, file$1, 24, 4, 810);
    			attr_dev(div1, "role", "radiogroup");
    			attr_dev(div1, "class", "group-container svelte-ycsj0z");
    			attr_dev(div1, "aria-labelledby", `label-${/*uniqueID*/ ctx[5]}`);
    			set_style(div1, "font-size", /*fontSize*/ ctx[3] + "px");
    			set_style(div1, "flex-direction", /*flexDirection*/ ctx[4]);
    			attr_dev(div1, "id", `group-${/*uniqueID*/ ctx[5]}`);
    			add_location(div1, file$1, 17, 0, 611);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, t0);
    			append_dev(div1, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*legend*/ 4) set_data_dev(t0, /*legend*/ ctx[2]);

    			if (dirty & /*slugify, options, userSelected*/ 67) {
    				each_value = /*options*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*fontSize*/ 8) {
    				set_style(div1, "font-size", /*fontSize*/ ctx[3] + "px");
    			}

    			if (dirty & /*flexDirection*/ 16) {
    				set_style(div1, "flex-direction", /*flexDirection*/ ctx[4]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Radio', slots, []);
    	let { options } = $$props;
    	let { legend } = $$props;
    	let { userSelected = options[0].value } = $$props;
    	let { fontSize = 16 } = $$props;
    	let { flexDirection = "column" } = $$props;
    	const uniqueID = Math.floor(Math.random() * 100);
    	const slugify = (str = "") => str.toLowerCase().replace(/ /g, "-").replace(/\./g, "");
    	const writable_props = ['options', 'legend', 'userSelected', 'fontSize', 'flexDirection'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Radio> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[]];

    	function input_change_handler() {
    		userSelected = this.__value;
    		$$invalidate(0, userSelected);
    	}

    	$$self.$$set = $$props => {
    		if ('options' in $$props) $$invalidate(1, options = $$props.options);
    		if ('legend' in $$props) $$invalidate(2, legend = $$props.legend);
    		if ('userSelected' in $$props) $$invalidate(0, userSelected = $$props.userSelected);
    		if ('fontSize' in $$props) $$invalidate(3, fontSize = $$props.fontSize);
    		if ('flexDirection' in $$props) $$invalidate(4, flexDirection = $$props.flexDirection);
    	};

    	$$self.$capture_state = () => ({
    		options,
    		legend,
    		userSelected,
    		fontSize,
    		flexDirection,
    		uniqueID,
    		slugify
    	});

    	$$self.$inject_state = $$props => {
    		if ('options' in $$props) $$invalidate(1, options = $$props.options);
    		if ('legend' in $$props) $$invalidate(2, legend = $$props.legend);
    		if ('userSelected' in $$props) $$invalidate(0, userSelected = $$props.userSelected);
    		if ('fontSize' in $$props) $$invalidate(3, fontSize = $$props.fontSize);
    		if ('flexDirection' in $$props) $$invalidate(4, flexDirection = $$props.flexDirection);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		userSelected,
    		options,
    		legend,
    		fontSize,
    		flexDirection,
    		uniqueID,
    		slugify,
    		input_change_handler,
    		$$binding_groups
    	];
    }

    class Radio extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			options: 1,
    			legend: 2,
    			userSelected: 0,
    			fontSize: 3,
    			flexDirection: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Radio",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*options*/ ctx[1] === undefined && !('options' in props)) {
    			console.warn("<Radio> was created without expected prop 'options'");
    		}

    		if (/*legend*/ ctx[2] === undefined && !('legend' in props)) {
    			console.warn("<Radio> was created without expected prop 'legend'");
    		}
    	}

    	get options() {
    		throw new Error("<Radio>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set options(value) {
    		throw new Error("<Radio>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get legend() {
    		throw new Error("<Radio>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set legend(value) {
    		throw new Error("<Radio>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get userSelected() {
    		throw new Error("<Radio>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set userSelected(value) {
    		throw new Error("<Radio>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get fontSize() {
    		throw new Error("<Radio>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fontSize(value) {
    		throw new Error("<Radio>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get flexDirection() {
    		throw new Error("<Radio>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set flexDirection(value) {
    		throw new Error("<Radio>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* webviews/components/ClassBrowser.svelte generated by Svelte v3.49.0 */

    const { console: console_1 } = globals;
    const file = "webviews/components/ClassBrowser.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	return child_ctx;
    }

    // (109:1) {#each searchResults as classType}
    function create_each_block(ctx) {
    	let li;
    	let button;
    	let span0;
    	let t0_value = /*classType*/ ctx[9].name + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2_value = (/*classType*/ ctx[9]?.containerName || "") + "";
    	let t2;
    	let button_title_value;
    	let t3;
    	let li_style_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[8](/*classType*/ ctx[9]);
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
    			attr_dev(span0, "class", "class svelte-1558r26");
    			add_location(span0, file, 121, 16, 3264);
    			attr_dev(span1, "class", "container svelte-1558r26");
    			add_location(span1, file, 122, 16, 3324);
    			attr_dev(button, "class", "symbol svelte-1558r26");
    			attr_dev(button, "title", button_title_value = /*classType*/ ctx[9]?.kind.toString() + " " + /*classType*/ ctx[9]?.name);
    			add_location(button, file, 110, 12, 2846);
    			attr_dev(li, "style", li_style_value = `color: ${color(/*classType*/ ctx[9]?.kind.toString())};`);
    			attr_dev(li, "class", "svelte-1558r26");
    			add_location(li, file, 109, 2, 2774);
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
    			if (dirty & /*searchResults*/ 1 && t0_value !== (t0_value = /*classType*/ ctx[9].name + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*searchResults*/ 1 && t2_value !== (t2_value = (/*classType*/ ctx[9]?.containerName || "") + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*searchResults*/ 1 && button_title_value !== (button_title_value = /*classType*/ ctx[9]?.kind.toString() + " " + /*classType*/ ctx[9]?.name)) {
    				attr_dev(button, "title", button_title_value);
    			}

    			if (dirty & /*searchResults*/ 1 && li_style_value !== (li_style_value = `color: ${color(/*classType*/ ctx[9]?.kind.toString())};`)) {
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
    		source: "(109:1) {#each searchResults as classType}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div2;
    	let pre;
    	let t0;

    	let t1_value = JSON.stringify(
    		{
    			searchQuery: /*searchQuery*/ ctx[2],
    			searchType: /*searchType*/ ctx[1]
    		},
    		null,
    		2
    	) + "";

    	let t1;
    	let t2;
    	let t3;
    	let input;
    	let t4;
    	let div0;
    	let radio;
    	let updating_userSelected;
    	let t5;
    	let div1;
    	let ul;
    	let current;
    	let mounted;
    	let dispose;

    	function radio_userSelected_binding(value) {
    		/*radio_userSelected_binding*/ ctx[7](value);
    	}

    	let radio_props = {
    		options: /*TypeOptions*/ ctx[3],
    		fontSize: 16,
    		legend: "Select a Type"
    	};

    	if (/*searchType*/ ctx[1] !== void 0) {
    		radio_props.userSelected = /*searchType*/ ctx[1];
    	}

    	radio = new Radio({ props: radio_props, $$inline: true });
    	binding_callbacks.push(() => bind(radio, 'userSelected', radio_userSelected_binding));
    	let each_value = /*searchResults*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			pre = element("pre");
    			t0 = text("    ");
    			t1 = text(t1_value);
    			t2 = text("\n");
    			t3 = space();
    			input = element("input");
    			t4 = space();
    			div0 = element("div");
    			create_component(radio.$$.fragment);
    			t5 = space();
    			div1 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(pre, file, 91, 0, 2282);
    			attr_dev(input, "class", "query-input");
    			add_location(input, file, 94, 0, 2352);
    			attr_dev(div0, "class", "types svelte-1558r26");
    			add_location(div0, file, 102, 0, 2558);
    			attr_dev(ul, "class", "class-browse svelte-1558r26");
    			add_location(ul, file, 107, 0, 2710);
    			attr_dev(div1, "class", "browse");
    			add_location(div1, file, 106, 0, 2689);
    			attr_dev(div2, "class", "main");
    			add_location(div2, file, 90, 0, 2263);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, pre);
    			append_dev(pre, t0);
    			append_dev(pre, t1);
    			append_dev(pre, t2);
    			append_dev(div2, t3);
    			append_dev(div2, input);
    			set_input_value(input, /*searchQuery*/ ctx[2]);
    			append_dev(div2, t4);
    			append_dev(div2, div0);
    			mount_component(radio, div0, null);
    			append_dev(div2, t5);
    			append_dev(div2, div1);
    			append_dev(div1, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[5]),
    					listen_dev(input, "input", /*input_handler*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*searchQuery, searchType*/ 6) && t1_value !== (t1_value = JSON.stringify(
    				{
    					searchQuery: /*searchQuery*/ ctx[2],
    					searchType: /*searchType*/ ctx[1]
    				},
    				null,
    				2
    			) + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*searchQuery*/ 4 && input.value !== /*searchQuery*/ ctx[2]) {
    				set_input_value(input, /*searchQuery*/ ctx[2]);
    			}

    			const radio_changes = {};

    			if (!updating_userSelected && dirty & /*searchType*/ 2) {
    				updating_userSelected = true;
    				radio_changes.userSelected = /*searchType*/ ctx[1];
    				add_flush_callback(() => updating_userSelected = false);
    			}

    			radio.$set(radio_changes);

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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(radio.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(radio.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(radio);
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

    function searchAll() {
    	search("all", "*");
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
    		default:
    			return "white";
    	}
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ClassBrowser', slots, []);

    	const TypeOptions = [
    		{ value: "data", label: "Data" },
    		{ value: "process", label: "Process" },
    		{ value: "container", label: "Container" }
    	];

    	let searchResults = [];
    	let searchType = "data";
    	let searchQuery = "";

    	onMount(async () => {
    		// this is used to recieve message from sidebar provider
    		window.addEventListener("message", async event => {
    			const message = event.data;

    			switch (message.type) {
    				case "class-result":
    					{
    						console.log("class-result", message.value);
    						$$invalidate(0, searchResults = message.value);
    						break;
    					}
    				case "partial-class-result":
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

    	function searchSymbol(query) {
    		if (searchType === "data") searchData(query); else if (searchType === "process") searchProcess(query); else searchContainer(query);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<ClassBrowser> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		searchQuery = this.value;
    		$$invalidate(2, searchQuery);
    	}

    	const input_handler = () => {
    		// if (searchQuery === "*") 
    		//     searchAll()
    		// else 
    		//     search(searchQuery)
    		searchSymbol(searchQuery);
    	};

    	function radio_userSelected_binding(value) {
    		searchType = value;
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
    		Radio,
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
    		searchSymbol,
    		input_input_handler,
    		input_handler,
    		radio_userSelected_binding,
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
