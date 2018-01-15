##### vscode-wrap-console-log

# CHANGELOG

---

## 1.6.0
##### 2018-01-15

### Added
- Custom wrap text!
- New config settings `.wrapText`

Specify the text to wrap with with the new setting `.wrapText`.
The default value of this setting is `console.log($txt);` where `$txt` specifies where the variable/text should be inserted. If the value of `.wrapText` does not include `$txt` vscode will warn you. Make sure you specify `$txt` ONE time if you change this setting.

---


## 1.5.0
##### 2018-01-12

### Added
- New command `wrap.string`
- New command `wrap.string.up`
- New command `wrap.string.down`

### Fixed
- Fail to log down bugs

It is now possible to log what you type as text. Check out the new feature in the updated README.md.

If you like this extensioin or have any suggestion or bug you found please hit me up on github and/or drop a rating/review on the marketplace. :)

Happy coding!

---

## 1.4.0
##### 2017-11-07

### Changed

- [Down] and [Up] will now create a new line by default. If the target line is empty you can now decide if you rather have 'console.log' replace the empty line. Set this behaviour with the new `.onEmptyLineAction` setting.

### Added

- New config setting `.onEmptyLineAction`
- New config setting `.setCursorOnNewLine`

By setting `.setCursorOnNewLine` to `true` the cursor will move to the new line when one is created by wrapping 'console.log' [Down] or [Up].


---

## 1.3.3
##### 2017-09-11

### Changed

- `Wrap down` will now, if next line exists:
    - Keep same indent as **current line** if next line indent is shorter.
    - Use the same indent as **next line** if next line indent is longer.

---

## 1.3.2
##### 2017-09-10

### Changed

- `Wrap down` will now, if next line exists but is empty, insert without creating a new line

### Fixed

- Indent break on wrap down
- `Wrap down` fail to execute if no line exist below
- Unhandled promise rejections

---

## 1.3.1
##### 2017-08-30

### Added

- Description for config setting `.alwaysInputBoxOnPrefix`

---

## 1.3.0
##### 2017-08-30

### Added

- CHANGELOG file
- New command `:InlinePrefixInput`
- New command `:UpPrefixInput`
- New command `:DownPrefixInput`
- New config setting `.alwaysUsePrefix`
- New config setting `.alwaysInputBoxOnPrefix`
- New keybinding `ctrl+shift+alt+w ctrl+shift+alt+w`
- New keybinding `ctrl+shift+alt+up ctrl+shift+alt+up`
- New keybinding `ctrl+shift+alt+down ctrl+shift+alt+down`
- Keybindings now have 'when' statements

### Changed

- Renamed command `:UpArg` to `:UpPrefix`
- Renamed command `:DownArg` to `:DownPrefix`
- Renamed command `:InlineArg` to `:InlinePrefix`
- Some config settings titles/descriptions now make more sense

### Removed

- Test files

---

## 1.2.1 
##### 2017-08-28

### Added

- New config setting for "Prefix from input box"

---

## 1.2.0 
##### 2017-08-28

### Added

- New feature "Prefix from input box"
- Extension icon image
- New GIF screenshot

### Changed

- Package now specify extension keywords for the marketplace
- README to make more sense

---

## 1.0.0 
##### 2017-08-28

- Initial release