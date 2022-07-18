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

# Todo
- [ ] ~~Fetch members of selected class(Maybe?)~~ Since Outline view is better.
- [ ] Fetch other types(functions)
- [ ] Give option to filter out types
- [ ] UI enhancements(icons, hover labels)