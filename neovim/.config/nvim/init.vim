set runtimepath^=~/.vim
set runtimepath+=~/.vim/after
let &packpath=&runtimepath
source ~/.vimrc

au TermOpen * setlocal nonumber nornu so=0 | startinsert

set inccommand=nosplit
