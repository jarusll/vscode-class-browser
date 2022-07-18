<script lang="ts">
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

    let classResults: Array<VSCodeSymbol> = []
    let searchQueryInput: any
    let searchQuery = ""

    onMount(async () => {
        // this is used to recieve message from sidebar provider
        window.addEventListener("message", async (event) => {
            const message = event.data;
            switch (message.type) {
                case "class-result": {
                    classResults = message.value
                    break;
                }
                case "partial-class-result": {
                    // append
                    classResults = classResults.concat(message.value)
                    // remove duplicates
                    classResults = classResults.filter((value: any, index, self) =>
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

    function search(queryAction: {type: String, value: any}) {
        post(queryAction)
    }

    function searchClass(query: String){
        post({type: "search-class", value: query})
    }

    function searchMethod(query: String){
        post({type: "search-method", value: query})
    }

    function searchAll() {
        post({type: "search-all", value: searchQuery})
    }

    function open(query: String){
        post({type: "open", value: query})
    }

</script>

<div class="main">
<input bind:this={searchQueryInput} bind:value={searchQuery} on:input={() => {
    if (searchQuery === "*") 
        searchAll()
    else if (searchQuery.length > 1) 
        searchClass(searchQuery)
}} class="query-input"/>
<div class="browse">
<ul class="class-browse">
	{#each classResults as classType}
		<li>
            <button class="symbol" 
                title={classType?.containerName}
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
        color: rgb(59, 125, 168);
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
</style>