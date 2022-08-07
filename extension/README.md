![Icon](https://github.com/jarusll/vscode-class-browser/blob/master/extension/media/icon.png?raw=true)
# Class Browser

A vscode extension which indexes
- Data(classes/interfaces/structs/enums)
- Function
- Container(namespace/module/package)

# Showcase

![Alt Text](https://github.com/jarusll/vscode-class-browser/blob/master/extension/media/showcase.gif?raw=true)

# Recommendation
It pairs up really well with Outline view so if you do plan to use it, I recommend use it along with the outline view.

I also recommend you set shortcuts for Class Browser and Outline view.

I have set Ctrl-Shfit-[ for Class Browser and Ctrl-Shift-] for Outline.

# Limitations
It needs a file open for it to work. For eg. If you want indexing for php It will need a php file open. I do not know how to fix it.

It will index files which are not in project path. For eg It will index all the java symbols even though they are not in the path and its source code cannot be read unless its decompiled. I have a way to fix this and will do it soon.

While switching between types the results could overlap.

~~Performance issues may arise from excessive indexing.~~ Lazy fetching has been added to fix this.

# Done
- [x] List all classes
- [x] Open the class file and jump to its position
- [x] Fetch other types(functions)
- [x] Give option to filter out types
- [x] Lazy loading
- [x] UI enhancements(hover labels, loading indicator)

# Todo
- [ ] ~~Fetch members of selected class(Maybe?)~~ Since Outline view is better.
- [ ] Come up with todo items

## Release Notes
### 1.0.2
Change fetch interval from 1s to 100ms

### 1.0.0
Added lazy fetching. Symbols are fetched every 1 second. This will fix the performance issue.
UI enhancements
- Fetching indicator
- Scrollable results section

### 0.0.6
Added filtering by types

### 0.0.5
Fix showcase path

### 0.0.4
Added color coding to types
Interface - Yellow
Class - Blue
Struct - Red

When an item is clicked, the focus will shift to outline view after 1 second.

### 0.0.3
Added gif & removed console.logs

### 0.0.2
Added icons

### 0.0.1
- List all classes
- Open the class file and jump to its position

**Enjoy!**
