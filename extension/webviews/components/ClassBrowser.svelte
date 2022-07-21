<script lang="ts">
import { onMount } from "svelte";
import Radio from "./Radio.svelte";

    interface VSCodeSymbol {
        name: string;
        kind: number;
        containerName: string;
        location: {
            uri: {
                path: string
            },
            range: [
                [
                    line: number,
                    character: number
                ],
                [
                    line: number,
                    character: number
                ]
            ];
        };
    };

    const TypeOptions: Array<any> = [
        {
            value: "data",
            label: "Data"
        },
        {
            value: "process",
            label: "Process"
        },
        {
            value: "container",
            label: "Container"
        }
    ];
    let searchResults: Array<VSCodeSymbol> = []
    let searchType: string = "data";
    let searchQuery: string = "";

    onMount(async () => {
        // this is used to recieve message from sidebar provider
        window.addEventListener("message", async (event) => {
            const message = event.data;
            switch (message.type) {
                case "class-result": {
                    console.log("class-result", message.value)
                    searchResults = message.value
                    break;
                }
                case "partial-class-result": {
                    // append
                    searchResults = searchResults.concat(message.value)
                    // remove duplicates
                    searchResults = searchResults.filter((value: any, index, self) =>
                        index === self.findIndex((t: any) => (
                            t.name === value.name
                        )))
                    break;
                }
            }
        });

        // setTimeout(() => searchAll(), 3000)
        // this is used to send message to provider
        // tsvscode.postMessage({ type: "get-token", value: undefined });
        // searchQueryInput.focus()
    });

    function post(message: {type: String, value: any}) {
        tsvscode.postMessage(message);
    }

    function search(type: string, query: string) {
        post({
            type: "search-" + type,
            value: query
        })
    }

    function searchData(query: string){
        search("data", query)
    }

    function searchProcess(query: string){
        search("process", query)
    }

    function searchContainer(query: string){
        search("container", query)
    }

    function searchAll() {
        search("all", "*")
    }

    function searchSymbol(query: string){
        if (searchType === "data")
            searchData(query)
        else if (searchType === "process")
            searchProcess(query)
        else 
            searchContainer(query)
    }

    function open(query: String){
        post({type: "open", value: query})
    }

    function color(kind: string): string{
        switch(kind){
        case "Interface":
            return "yellow"
        case "Class":
            return "aqua"
        case "Struct":
            return "orange"
        default:
            return "white"
        }
    }

</script>

<div class="main">
<pre>
    {JSON.stringify({searchQuery, searchType}, null, 2)}
</pre>
<input bind:value={searchQuery} on:input={() => {
    // if (searchQuery === "*") 
    //     searchAll()
    // else 
    //     search(searchQuery)
    searchSymbol(searchQuery)
}} class="query-input"/>

<div class="types">
    <Radio options={TypeOptions} fontSize={16} legend='Select a Type' bind:userSelected={searchType}/>
</div>

<div class="browse">
<ul class="class-browse">
	{#each searchResults as classType}
		<li style={`color: ${color(classType?.kind.toString())};`}>
            <button class="symbol" 
                title={classType?.kind.toString() + " " + classType?.name}
                on:click={() => {
                post({
                    type: "open",
                    value: {
                        path: classType?.location?.uri?.path,
                        position: classType?.location?.range[0]
                    }
                })
            }}>
                <span class="class">{classType.name}</span>
                <span class="container">{classType?.containerName || ""}</span>
            </button>
        </li>
	{/each}
</ul>
</div>
</div>

<style>
    ul {
        list-style-type: square;
        list-style-position: inside;
    }
    li {
        color: rgb(173, 40, 42);
    }
    .symbol {
        text-align: left;
        background-color: transparent;
        font-size: 1rem;
        width: max-content;
    }
    .symbol:hover {
        background-color: rgb(59, 125, 168);
    }
    .class {
        text-align: left;
    }
    .container {
        text-align: right;
        color: gray;
        text-overflow: ellipsis;
    }
    .types {
        margin: 0.5rem;
    }
</style>