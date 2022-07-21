<p align="center">
  <img src="extension/media/icon.png" />
</p>

<h2 align="center">
Class Browser
</h2>

![Showcase](extension/media/showcase.gif)

A vscode extension which provides the listing of classes/interfaces/structs.

# Implementation
Piggybacks on vscode's SymbolProvider.

# Prototype
- [x] List all classes
- [x] Open the class file and jump to its position
- [x] Fetch other types(functions)
- [x] Give option to filter out types

# Todo
- [ ] ~~Fetch members of selected class(Maybe?)~~ Since Outline view is better.
- [ ] UI enhancements(icons, hover labels)

# Limitations:

It needs a file open for it to work. For eg. If you want indexing for php It will need a php file open. I do not know how to fix it.

It will index files which are not in project path. For eg It will index all the java symbols even though they are not in the path and its source code cannot be read unless its decompiled. I have a way to fix this and will do it soon.

Performance issues may arise from excessive indexing. Right now I have no caching.

# Recommendation:

It pairs up really well with Outline view so if you do plan to use it, I recommend use it along with the outline view.

I also recommend you set shortcuts for Class Browser and Outline view.

I have set `Ctrl-Shfit-[` for Class Browser and `Ctrl-Shift-]` for Outline.

Extension Links:
- OpenVSX:- https://open-vsx.org/extension/jarusll/class-browser
- Marketplace:- https://marketplace.visualstudio.com/items?itemName=jarusll.class-browser