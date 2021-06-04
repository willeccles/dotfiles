set runtimepath^=~/.vim
set runtimepath+=~/.vim/after
let &packpath=&runtimepath
source ~/.vimrc

au TermOpen * setlocal nonumber nornu so=0 | startinsert

set inccommand=nosplit

" partially transparent popup menu and floating windows
set pb=20
set winbl=20

set titlestring=%t\ -\ NVIM

if has('nvim-0.5.0')
  call plug#begin('~/.vim/plugged')
  if executable('tree-sitter')
    Plug 'nvim-treesitter/nvim-treesitter', {'do': ':TSUpdate'}
  endif
  Plug 'folke/which-key.nvim'
  call plug#end()

 lua require('cactus.config')
endif
