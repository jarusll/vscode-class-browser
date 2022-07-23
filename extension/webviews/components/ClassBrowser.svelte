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
    let isLoading: boolean = false;

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
                    console.log("partial-result", message.value)
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
                    console.log("exhausted")
                    stopAutosearch()
                    break;
                }
            }
        });

        // this is used to send message to provider
        // tsvscode.postMessage({ type: "get-token", value: undefined });
        setTimeout(() => {
            searchAll("data")
            startAutosearch()
        }, 3000);
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
        stopAutosearch()
        autoSearch = setInterval(() => showMore(), 1000)
        isLoading = true
    }

    function stopAutosearch(){
        clearInterval(autoSearch)
        isLoading = false
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
<div class="form">
<input bind:value={searchQuery} on:input={() => {
    if (searchQuery === ""){
        clearResults()
        searchAll(searchType)
    }
    else {
        clearResults()
        searchSymbol(searchQuery)
        startAutosearch()
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
    <!-- result count -->
    <div class="index-count">
        {searchResults.length} Indexed
    </div>
    <div class:loading={isLoading}>
    </div>
</div>
</div>

<ul class="browse">
    <!-- result -->
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
    .symbol {
        text-align: left;
        background-color: transparent;
        font-size: 1rem;
        max-width: 250px;
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
        display: flex;
        flex-direction: column;
        position: absolute;
        height: 100%;
        margin: 0;
        padding: 0.1rem;
    }
    .form {
        /* height: 16%; */
    }
    .browse {
        position: relative;
        overflow-y: scroll; 
        overflow-x: hidden;
        /* height: 82%; */
        list-style-type: square;
        list-style-position: inside;
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
    .loading {
        background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' version='1.1' width='575' height='6px'%3E %3Cstyle%3E circle { animation: ball 2.5s cubic-bezier(0.000, 1.000, 1.000, 0.000) infinite; fill: %23bbb; } %23balls { animation: balls 2.5s linear infinite; } %23circle2 { animation-delay: 0.1s; } %23circle3 { animation-delay: 0.2s; } %23circle4 { animation-delay: 0.3s; } %23circle5 { animation-delay: 0.4s; } @keyframes ball { from { transform: none; } 20% { transform: none; } 80% { transform: translateX(864px); } to { transform: translateX(864px); } } @keyframes balls { from { transform: translateX(-40px); } to { transform: translateX(30px); } } %3C/style%3E %3Cg id='balls'%3E %3Ccircle class='circle' id='circle1' cx='-115' cy='3' r='3'/%3E %3Ccircle class='circle' id='circle2' cx='-130' cy='3' r='3' /%3E %3Ccircle class='circle' id='circle3' cx='-145' cy='3' r='3' /%3E %3Ccircle class='circle' id='circle4' cx='-160' cy='3' r='3' /%3E %3Ccircle class='circle' id='circle5' cx='-175' cy='3' r='3' /%3E %3C/g%3E %3C/svg%3E") 50% no-repeat;
        width: 100%; 
        padding: 10px;
    }
    .index-count {
        text-align: center;
        font-size: 1.2rem;
    }
</style>