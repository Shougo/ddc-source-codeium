# ddc-source-codeium

Codeium completion for ddc.vim

## Required

### codeium.vim

https://github.com/Exafunction/codeium.vim

### denops.vim

https://github.com/vim-denops/denops.vim

### ddc.vim

https://github.com/Shougo/ddc.vim

## Configuration

```vim
let g:codeium_disable_bindings = 1

call ddc#custom#patch_global('sources', ['codeium'])

call ddc#custom#patch_global('sourceOptions', #{
      \   input: #{
      \     mark: 'codeium',
      \     matchers: [],
      \     minAutoCompleteLength: 0,
      \   }
      \ })
```
