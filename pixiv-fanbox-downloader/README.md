# Pixiv Fanbox Downloader

## Features

1. Download images and files in posts on Pixiv Fanbox with just one click.

   (**Note: You need to be a supporter of the creator to access contents at your supporting tier. This userscript cannot access any locked contents.**)
2. Customizable templates for file names and save locations.
3. Use keyboard shortcuts to navigate, like posts, download files (see note above) and [more](#keyboard-shortcuts).
4. Add the missing link to the Pixiv page of the creator.
5. Automatically redirect to the canonical URL of the page.

## Filename formats

### Templates

- `{downloadDir}`: (_Optional_) The directory relative to the default download directory as the root of all downloaded files.
- `{userDir}`: (_Optional_) Files from the same creator will be downloaded to this directory.
- `{basename}`: Filename format (without file extension).

The final path of the file is the concatenation of all three templates in order (relative to the default download directory): `{downloadDir}/{userDir}/{basename}`. Empty templates and their path separators will be omitted.

### Tokens

- `{username}`: The name of the author.
- `{creatorId}`: The fanbox ID of the author, without the "@".
- `{userId}`: The pixiv ID of the author.
- `{postId}`: The ID of the post.
- `{index}`: The index number of the file, starting from 1.
- `{filename}`: The original filename of a downloadable file.
- `{|{formatName}}`: Conditional token, resolves to the value before the vertical bar if the token `{formatName}` does not have a value, otherwise resolves to the value of `{formatName}`.

  _Example_: `{no name| ({filename})}` would resolve to "no name" if the token `{filename}` did not have a value, or " (example)" if the value of `{filename}` was "example".

## Keyboard shortcuts

| Key | Description |
| --- | ----------- |
| <kbd> </kbd> (space) | Scroll to main content |
| <kbd>d</kbd> | Download files |
| <kbd>a</kbd> | Like the post |
| <kbd>s</kbd> | Download files and like the post |
| <kbd>v</kbd> | Open image viewer |
| <kbd>←</kbd> (left arrow), <kbd>q</kbd> | Newer post |
| <kbd>→</kbd> (right arrow), <kbd>e</kbd> | Older post |