"enable powerline
"set rtp+=/usr/local/lib/python2.7/site-packages/powerline/bindings/vim
"set noshowmode "disables showing the current mode, useful in conjunction with powerline

set laststatus=2
set noshowmode

" modes
let g:currentmode={
	\ 'n'  : 'N',
	\ 'no' : 'N·OP',
	\ 'v'  : 'V',
	\ 'V'  : 'V·L',
	\ '' : 'V·B',
	\ 's'  : 'S',
	\ 'S'  : 'S·L',
	\ '' : 'S·B',
	\ 'i'  : 'I',
	\ 'R'  : 'R',
	\ 'Rv' : 'V·R',
	\ 'c'  : 'Cmd',
	\ 'cv' : 'V·Ex',
	\ 'ce' : 'Ex',
	\ 'r'  : 'P',
	\ 'rm' : 'M',
	\ 'r?' : 'Conf',
	\ '!'  : 'Sh',
	\}

"for adding a plus to the statusline when a file has been modified
fu! Modstatus()
	return &modified ? '+' : ''
endfunction

"readonly status
fu! ReadOnly()
	return &readonly ? ' [RO]' : ''
endfunction

"filetype
fu! Ftype()
	return substitute(&filetype, "[[]]", "", "")
endfunction

"statusline
:set statusline=%#CP_MODE#\ %{toupper(g:currentmode[mode()])}\  "shows mode
":set statusline+=\ %#CP_MODEDIV#⇢\  "divider after mode
:set statusline+=%< "where to truncate the line, in other words always show mode
:set statusline+=%#CP_FNAME#\ %f "filename
:set statusline+=%{Modstatus()} "modified status of buffer
:set statusline+=%{ReadOnly()} "redonly status
":set statusline+=\ %#CP_FNAMEDIV#⇢\  "filename divider
:set statusline+=\ %#CP_MID# "set color for middle of SL
:set statusline+=\ %{Ftype()} "filetype
:set statusline+=%= "every statusline addition after this line will be right justified
:set statusline+=%p%%\  "percentage through the file in lines
:set statusline+=%#CP_37#\ L%l:C%c\  "line number and character on that line

syntax enable "syntax hilighting

"this works in MacVim, hence I set Operator Mono to be my font in MacVim
highlight Comment cterm=italic

"for seattle
colorscheme seattle

"change colors on tabs, selected and unselected
highlight! link TabLine CP_19
highlight! link TabLineSel CP_39

"these are custom hilight groups i used for the statusline, modified from
"seattle's colors. any hilight groups used that aren't in this list are from
"seattle.vim
highlight CP_FNAMEDIV guibg=#4D4D4D gui=bold
highlight CP_MODE guibg=#FFFFFF guifg=#292929 gui=bold
highlight CP_MODEDIV guibg=#F69A42 guifg=#FFFFFF gui=bold
highlight CP_FNAME guibg=#F69A42 guifg=#FFFFFF gui=italic
highlight CP_MID guibg=#4D4D4D

if !has("gui_running")
highlight CP_FNAMEDIV ctermbg=239 ctermfg=209 cterm=bold
highlight CP_MODE ctermbg=231 ctermfg=235 cterm=bold
highlight CP_MODEDIV ctermbg=209 ctermfg=231 cterm=bold
highlight CP_FNAME ctermbg=209 ctermfg=231
highlight CP_MID ctermbg=239
endif

set guifont=Operator\ Mono\ Book:h12 "for MacVim

set number "line numbers

filetype plugin indent on "enable indenting
set tabstop=4 "show existing tabs with 4 spaces width
set shiftwidth=4 "indent 4 spaces when using > to indent
"set expandtab "this would put in 4 spaces when pressing tab

"folding should be manual
setlocal foldmethod=manual

map <F7> <Esc>:tabp<Return>
map <F8> <Esc>:tabn<Return>
"use tabe instead of tabf, e works the same as :e
map <F9> <Esc>:tabe 

"unused keybinds that i could use at any time
"map <F5> <Esc>:w<Return>
"map <F6> <Esc>:q<Return>

map <F10> <Esc>:%s/\([)>a-zA-Z0-9]\){/\1 {/ge<Return>:%s/{\zs\s\+\ze$//ge<Return>:%s/\([^\s\t ]\)[\s\t ]*\n[\s\t ]*{\(.*\)$/\1 {\r\2/ge<Return>ggVG=:w<Return>

"compile
map <F1> <Esc>:make<Return>
"open error list
map <F2> <Esc>:copen<Return>
"previous error
map <F3> <Esc>:cprevious<Return>
"next error
map <F4> <Esc>:cnext<Return>
"close error output
map <F5> <Esc>:cclose<Return>

"java compilation stuff
autocmd Filetype java set makeprg=cd\ '%:h'\ &&\ javac\ '%:t'
autocmd Filetype java set errorformat=%A%f:%l:\ %m,%-Z%p^,%-C%.%#
"c compilation stuff
autocmd Filetype c set makeprg=gcc\ -o\ '%<'.out\ '%'
"c++ compilation stuff
autocmd Filetype cpp,c++ set makeprg=g++\ -o\ '%<'.out\ '%'\ -std=c++14
"tex pdf compilation
autocmd Filetype tex set makeprg=pdflatex\ '%'

"change how the default split works (to make it more natural than vim's
"default)
set splitright
set splitbelow

nnoremap <W> <C-W>
"enable mouse: :set mouse=a
set backspace=indent,eol,start
