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

" disable copilot by default
autocmd VimEnter * exe "Copilot disable"
