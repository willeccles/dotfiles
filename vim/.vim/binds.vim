" key used for <Leader>
let mapleader=";"

"press escape to exit insert mode in terminal to be able to switch windows
tnoremap <Esc> <C-\><C-n>
tmap <C-w> <Esc><C-w>

"switch windows with <Tab> followed by a direction
"also works with leader
nnoremap <Tab> <C-w>
nnoremap <Leader><Up> <C-w><Up>
nnoremap <Leader><Down> <C-w><Down>
nnoremap <Leader><Left> <C-w><Left>
nnoremap <Leader><Right> <C-w><Right>
nnoremap <Leader>k <C-w><Up>
nnoremap <Leader>j <C-w><Down>
nnoremap <Leader>h <C-w><Left>
nnoremap <Leader>l <C-w><Right>

"use Z to toggle folds
nnoremap Z za
"also use <Leader>z to toggle folds
nnoremap <Leader>z za

"use <Leader>s to save the file (if it was changed)
"nnoremap <silent> <Leader>s :up<CR>
"use <Leader>S to strip trailing whitespace
"nnoremap <silent> <Leader>S :silent! StripWhitespace<CR>

" sort paragraphs using control-s, reverse sort using alt-s
nnoremap <silent> <C-s> vip:sort<CR>
nnoremap <silent> <M-s> vip:sort!<CR>

" copy to clipboard in visual mode with c-y
if has('clipboard')
  vnoremap <C-y> "+y<CR>
endif

nnoremap <silent> g= :retab<CR>mvgg=G`v

nnoremap <silent> <C-Up> :move--<CR>
nnoremap <silent> <C-Down> :move+<CR>
nmap <C-k> <C-Up>
nmap <C-j> <C-Down>

noremap <silent> <F7> <Esc>:tabp<CR>
noremap <silent> <F8> <Esc>:tabn<CR>
"use tabe instead of tabf, e works the same as :e
noremap <F9> <Esc>:tabe<Space>
noremap <silent> <C-F7> <Esc>:bp<CR>
noremap <silent> <C-F8> <Esc>:bn<CR>

noremap <silent> <F11> <Esc>:bp<CR>
noremap <silent> <F12> <Esc>:bn<CR>

"map <silent> <F10> <Esc>mp:%s/\([)>a-zA-Z0-9]\) {/\1 {/ge<CR>:%s/{\zs\s\+\ze$//ge<CR>:%s/\([^\s\t ]\)[\s\t ]*\n[\s\t ]*{\(.*\)$/\1 {\r\2/ge<CR>:%s/\r//ge<CR>:%s/}\zs\([^\s\t ;,\])}]\)/ \1/ge<CR>:%s/\(^\\|[\s\t ]\)\/\{2,}<\?!\?\zs\([^!<\s\t ]\)/ \2/ge<CR>:%s/[^\s\t ]\zs{/ {/ge<CR>gg=G:retab<CR>`p

" use F1 to look up help pages and man pages
nnoremap <F1> K

vnoremap < <gv
vnoremap > >gv

"<Leader>o will be like o, but will continue comments if &fo doesn't include o
nnoremap <Leader>o A<CR>

"compile
noremap <silent> <F2> <Esc>:make<CR>
"open error list
noremap <silent> <F3> <Esc>:copen<CR>
"previous error
noremap <silent> <F4> <Esc>:cprevious<CR>
"next error
noremap <silent> <F5> <Esc>:cnext<CR>
"close error output
noremap <silent> <F6> <Esc>:cclose<CR>
