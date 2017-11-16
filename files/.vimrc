"enabl powerline
"set rtp+=/usr/local/lib/python2.7/site-packages/powerline/bindings/vim

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
			\ 'i'  : '⎀',
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

syntax enable "syntax hilighting

" set theme for GUI
colorscheme forgotten-dark

" set theme for term
if !has("gui_running")
	colorscheme seattle
endif

" {{{ status line/tabs colors
if g:colors_name == "seattle"
	"these are custom hilight groups i used for the statusline, modified from
	"seattle's colors. any hilight groups used that aren't in this list are from
	"seattle.vim
	highlight CP_MODE guibg=#FFFFFF guifg=#292929 gui=bold
	highlight CP_FNAME guibg=#F69A42 guifg=#FFFFFF gui=italic
	highlight CP_MID guibg=#4D4D4D
	highlight CP_LNUM guibg=#5fb3b3 guifg=#ffffff

	"seattle is going to be the only theme used in a non-gui environment,
	"so it's the only one that gets this treatment
	if !has("gui_running")
		highlight CP_MODE ctermbg=231 ctermfg=235 cterm=bold
		highlight CP_FNAME ctermbg=209 ctermfg=231
		highlight CP_MID ctermbg=239
		highlight CP_LNUM ctermbg=73 ctermfg=231
	endif
elseif g:colors_name == "carbonized-dark"
	highlight CP_MODE guibg=#f0f0e1 guifg=#2b2b2b gui=bold
	highlight CP_FNAME guibg=#458a8a guifg=#f0f0e1 gui=italic
	highlight CP_MID guibg=#3b3b37
	highlight CP_LNUM guibg=#8b6a9e guifg=#fffff0
elseif g:colors_name == "carbonized-light"
	highlight CP_MODE guibg=#3b3b37 guifg=#fffff0 gui=bold
	highlight CP_FNAME guibg=#1b9e9e guifg=#fffff0 gui=italic
	highlight CP_MID guibg=#f0f0e1
	highlight CP_LNUM guibg=#a26fbf guifg=#fffff0
elseif g:colors_name == "forgotten-dark"
	highlight CP_MODE guibg=#f0f8ff guifg=#1d242b gui=bold
	highlight CP_FNAME guibg=#458a8a guifg=#dde6f0 gui=italic
	highlight CP_MID guibg=#2c333b
	highlight CP_LNUM guibg=#8b6a9e guifg=#dde6f0
elseif g:colors_name == "forgotten-light"
	highlight CP_MODE guibg=#2c333b guifg=#f0f8ff gui=bold
	highlight CP_FNAME guibg=#468dd4 guifg=#f0f8ff gui=italic
	highlight CP_MID guibg=#dde6f0
	highlight CP_LNUM guibg=#a26fbf guifg=#f0f8ff
elseif g:colors_name == "ayu"
	"set the colors used for the status line in ayu theme
	if g:ayucolor == "mirage"
		highlight CP_MODE guibg=#d9d7ce guifg=#000000 gui=bold
		highlight CP_FNAME guibg=#3e4b59 guifg=#FFFFFF gui=italic
		highlight CP_MID guibg=#303540 guifg=NONE
		highlight CP_LNUM guibg=#3e4b59 guifg=#FFFFFF
	elseif g:ayucolor == "dark"
		highlight CP_MODE guibg=#e6e1cf guifg=#000000 gui=bold
		highlight CP_FNAME guibg=#3e4b59 guifg=#FFFFFF gui=italic
		highlight CP_MID guibg=#191f26 guifg=NONE
		highlight CP_LNUM guibg=#3e4b59 guifg=#FFFFFF
	elseif g:ayucolor == "light"
		highlight CP_MODE guibg=#6e7580 guifg=#FFFFFF gui=bold
		highlight CP_FNAME guibg=#878f99 guifg=#000000 gui=italic
		highlight CP_MID guibg=#f5f5f5 guifg=NONE
		highlight CP_LNUM guibg=#878f99 guifg=#000000
	endif
endif

"change colors on tabs, selected and unselected
highlight! link TabLine CP_19
highlight! link TabLineSel CP_39
" }}} end status line/tab bar

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
:set statusline+=%#CP_LNUM#\ L%l:C%c\  "line number and character on that line
redraw!

set guifont=Operator\ Mono\ Book:h12 "for MacVim

set number "line numbers

filetype plugin indent on "enable indenting
set tabstop=4 "show existing tabs with 4 spaces width
set shiftwidth=4 "indent 4 spaces when using > to indent
"set expandtab "this would put in 4 spaces when pressing tab

"folding should be marker (works like manual, but also folds on triple curly
"braces automatically)
"reminder: open a fold with za, close a fold with zc, make a fold (in Visual) with zf
setlocal foldmethod=marker

map <F7> <Esc>:tabp<Return>
map <F8> <Esc>:tabn<Return>
"use tabe instead of tabf, e works the same as :e
map <F9> <Esc>:tabe 

map <F11> <Esc>:bp<Return>
map <F12> <Esc>:bn<Return>

map <F10> <Esc>:%s/\([)>a-zA-Z0-9]\) {/\1 {/ge<Return>:%s/{\zs\s\+\ze$//ge<Return>:%s/\([^\s\t ]\)[\s\t ]*\n[\s\t ]*{\(.*\)$/\1 {\r\2/ge<Return>:%s/\r//ge<Return>ggVG=:w<Return>

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

set mouse=a
set backspace=indent,eol,start

set runtimepath^=~/.vim/plugin/gitgutter.vim

"enable gitgutter
set updatetime=250
