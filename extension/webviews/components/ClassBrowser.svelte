<script lang="ts">
import { onMount } from "svelte";
import { validate_each_argument } from "svelte/internal";

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
    let searchResults: Array<VSCodeSymbol> = []
    let searchType: string = "data";
    let searchQuery: string = "";

    onMount(async () => {
        // this is used to recieve message from sidebar provider
        window.addEventListener("message", async (event) => {
            const message = event.data;
            switch (message.type) {
                case "result": {
                    searchResults = message.value
                    break;
                }
                case "partial-result": {
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

        // this is used to send message to provider
        // tsvscode.postMessage({ type: "get-token", value: undefined });
        searchAll("data")
    });

    function clearResults() {
        searchResults = []
    }

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

    function searchAll(type: string) {
        post({
            type: "search-all",
            value: {
                type,
                query: "*"
            }
        })
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
        case "Function":
            return "green"
        case "Namespace":
        case "Module":
        case "Package":
            return "orange"
        default:
            return "white"
        }
    }

</script>

<div class="main">
<!-- <pre>
    {JSON.stringify({searchQuery, searchType}, null, 2)}
</pre> -->
<div class="form">
<input bind:value={searchQuery} on:input={() => {
    if (searchQuery === "*")
        searchAll(searchType)
    else 
        searchSymbol(searchQuery)
}} class="query-input" placeholder="Filter by typing name"/>

<div class="types">
{#each TypeOptions as option}
    <div class="type">
        <input type="radio" id={option.value} value={option.value} 
            on:change={() => {
                clearResults()
                searchAll(option.value)
            }}
            bind:group={searchType} class="input-type"/>
        <label for={option.value}>{option.label}</label>
    </div>
{/each}
</div>
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
    .type {
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        margin: 0.5rem;
        cursor: pointer;
    }
    .type input {
        width: 30px;
        outline: none;
    }
</style>