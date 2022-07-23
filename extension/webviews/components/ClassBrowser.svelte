<script lang="ts">

let autoSearch: any

import { onMount } from "svelte";

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
    let showMoreButton: any;
    let showMoreFlag: boolean = true

    onMount(async () => {
        // this is used to recieve message from sidebar provider

        window.addEventListener("message", async (event) => {
            const message = event.data;
            switch (message.type) {
                case "result": {
                    showMoreFlag = true
                    searchResults = message.value
                    break;
                }
                case "partial-result": {
                    console.log("partial-result", message.value)
                    showMoreFlag = true
                    // append
                    searchResults = searchResults.concat(message.value)
                    // remove duplicates
                    searchResults = searchResults.filter((value: any, index, self) =>
                        index === self.findIndex((t: any) => (
                            t.name === value.name
                        )))
                    break;
                }
                case "results-exhausted": {
                    // showMoreFlag = false
                    console.log("exhausted")
                    stopAutosearch()
                    break;
                }
            }
        });

        // this is used to send message to provider
        // tsvscode.postMessage({ type: "get-token", value: undefined });
        searchAll("data")
        startAutosearch()
    });

    function clearResults() {
        searchResults = []
        stopAutosearch()
        resetBackend()
    }

    function clearSearch(){
        searchQuery = ""
    }

    function startAutosearch(){
        autoSearch = setInterval(() => showMore(), 1000)
    }

    function stopAutosearch(){
        clearInterval(autoSearch)
    }

    function resetBackend(){
        post({
            type: "reset",
            value: ""
        })
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
        stopAutosearch()
        clearResults()
        if (searchType === "data")
            searchData(query)
        else if (searchType === "process")
            searchProcess(query)
        else 
            searchContainer(query)
        startAutosearch()
    }

    function open(query: String){
        post({type: "open", value: query})
    }

    function showMore(){
        post({type: "show-more", value: ""})
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
<span>
    {searchResults.length}
</span>
<div class="form">
<input bind:value={searchQuery} on:input={() => {
    if (searchQuery === ""){
        clearResults()
        searchAll(searchType)
    }
    else {
        searchSymbol(searchQuery)
    }
}} class="query-input" placeholder="Filter by typing name"/>

<div class="types">
{#each TypeOptions as option}
    <div class="type">
        <input type="radio" id={option.value} value={option.value} 
            name="types"
            on:change={() => {
                clearResults()
                clearSearch()
                searchAll(option.value)
                startAutosearch()
            }}
            bind:group={searchType} class="input-type"/>
        <label for={option.value}>{option.label}</label>
    </div>
{/each}

</div>
<!-- {#if showMoreFlag}
    <button bind:this={showMoreButton} on:click={showMore}>Show More</button>
{/if} -->
</div>

<ul class="browse">
	{#each searchResults as classType}
		<li style={`color: ${color(classType?.kind.toString())};`} on:scroll={() => console.log("list scrolling")} 
                on:select={() => console.log("select")}>
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
        height: 300px;
        overflow-y: scroll;
    }
    .main {
        position: absolute;
        overflow-y: scroll;
    }
    .form {
        height: 15vh;
    }
    .browse {
        /* background-color: red; */
        overflow: scroll; 
        height: 85vh;
    }
    /* .container {
        text-align: right;
        color: gray;
        text-overflow: ellipsis;
    } */
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