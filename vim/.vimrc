"enable powerline
"set rtp+=/usr/local/lib/python2.7/site-packages/powerline/bindings/vim

set laststatus=2
set noshowmode
set t_Co=256
runtime macros/matchit.vim "this allows % to match HTML/XML tags, as well as the default opening and closing ([{<
set modeline
set background=dark

" keep 3 lines of context around the cursor
set scrolloff=3

set termguicolors

set nrformats=alpha " allow g<C-a> to increment letters

autocmd GUIEnter * set vb t_vb=

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

"line endings
fu! LEnds()
    let a:format = substitute(&fileformat, "[[]]", "", "")
    if a:format == 'unix'
        return '␊'
    elseif a:format == 'dos'
        return '␍␊'
    elseif a:format == 'mac'
        return '␍'
    else
        return ' '
    endif
endfunction

" source a file only if it exists
function! SourceIfExists(file)
    if filereadable(expand(a:file))
        exe 'source' a:file
    endif
endfunction

let g:go_highlight_array_whitespace_error = 0
let g:go_highlight_chan_whitespace_error = 0
let g:go_highlight_extra_types = 0
let g:go_highlight_space_tab_error = 0
let g:go_highlight_trailing_whitespace_error = 0

syntax enable "syntax hilighting

" source my colors which are updated from 'updatescheme'
" if they exist, there will be a variable called g:scheme_available
" this can be checked with if exists("g:scheme_available")
call SourceIfExists("~/.schemecolors.vim")

let g:gruvbox_italic=1
let g:gruvbox_contrast_dark='medium'
let g:gruvbox_inverse=0

if has("gui_running")
    if !exists("g:scheme_available")
        colorscheme gruvbox
    else
        " this will match my terminal colors which is nice
        colorscheme walgui
    endif
else
    " this matches the terminal colors
    "colorscheme walterm
    colorscheme gruvbox
endif

if !has("gui_running")
    set t_ZH=[3m
    set t_ZR=[23m
endif

" change the cursors if we are in the terminal
if !has("gui_running")
    let &t_SI.="\e[5 q"
    let &t_SR.="\e[4 q"
    let &t_EI.="\e[1 q"
endif

set cursorline

" {{{ status line/tabs colors
if g:colors_name == "seattle"
    "these are custom hilight groups i used for the statusline, modified from
    "seattle's colors. any hilight groups used that aren't in this list are from
    "seattle.vim
    highlight CP_MODE guibg=#FFFFFF guifg=#292929 gui=bold
    highlight CP_FNAME guibg=#F69A42 guifg=#FFFFFF gui=italic
    highlight CP_MID guibg=#4D4D4D
    highlight CP_LNUM guibg=#5fb3b3 guifg=#ffffff
    "seattle's cursorline coloring is horrible
    highlight CursorLineNr guibg=#292929 guifg=#AAAAAA gui=bold

    if !has("gui_running")
        highlight CP_MODE ctermbg=231 ctermfg=235 cterm=bold
        highlight CP_FNAME ctermbg=209 ctermfg=231
        highlight CP_MID ctermbg=239
        highlight CP_LNUM ctermbg=73 ctermfg=231
        highlight CursorLineNr ctermbg=NONE ctermfg=248 cterm=bold
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
elseif g:colors_name == "simplifysimplify-dark"
    highlight CP_MODE guibg=#e0e0e0 guifg=#2b2b2b gui=bold
    highlight CP_FNAME guibg=#458a8a guifg=#e0e0e0 gui=italic
    highlight CP_MID guibg=#404040
    highlight CP_LNUM guibg=#8b6a9e guifg=#e0e0e0
elseif g:colors_name == "simplifysimplify-light"
    highlight CP_MODE guibg=#6b6b6b guifg=#ffffff gui=bold
    highlight CP_FNAME guibg=#1b9e9e guifg=#ffffff gui=italic
    highlight CP_MID guibg=#e0e0e0
    highlight CP_LNUM guibg=#a26fbf guifg=#ffffff
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
elseif g:colors_name == "dracula"
    highlight CP_MODE guibg=#F8F8F2 guifg=#282A36 gui=bold
    highlight CP_FNAME guibg=#6272a4 guifg=#f8f8f2 gui=italic
    highlight CP_MID guibg=#343746 guifg=NONE
    highlight CP_LNUM guibg=#bd93f9 guifg=#f8f8f2

    if !has("gui_running")
        highlight CP_MODE ctermbg=255 ctermfg=236 cterm=bold
        highlight CP_FNAME ctermbg=61 ctermfg=255 cterm=italic
        "no mid color for this one
        highlight CP_LNUM ctermbg=141 ctermfg=255
    endif
elseif g:colors_name == "gruvbox" && &background == 'dark'
    if g:gruvbox_contrast_dark == 'medium'
        highlight CP_MODE guibg=#3c3836 guifg=#928374 cterm=bold
        highlight CP_FNAME guibg=#3c3836 guifg=#ebdbb2 cterm=italic
        highlight CP_MID guibg=#3c3836 guifg=#928374
        highlight CP_LNUM guibg=#3c3836 guifg=#ebdbb2

        if !has("gui_running")
            highlight CP_MODE ctermbg=237 ctermfg=245 cterm=bold
            highlight CP_FNAME ctermbg=237 ctermfg=223 cterm=italic
            highlight CP_MID ctermbg=237 ctermfg=245
            highlight CP_LNUM ctermbg=237 ctermfg=223
        endif
    endif
elseif g:colors_name == "walterm" || g:colors_name == "walgui"
    highlight CP_MODE cterm=bold gui=bold
    highlight CP_FNAME cterm=bold,italic gui=bold,italic
    highlight CP_MID cterm=NONE gui=NONE
    highlight CP_LNUM cterm=bold gui=bold
endif
" }}} end status line/tab bar

"statusline
:set statusline=%#CP_MODE#\ %{toupper(g:currentmode[mode()])}\  "shows mode
":set statusline+=\ %#CP_DIV#\|\  "divider after mode
:set statusline+=%< "where to truncate the line, in other words always show mode
:set statusline+=%#CP_FNAME#\ %f "filename
:set statusline+=%{Modstatus()} "modified status of buffer
:set statusline+=%{ReadOnly()} "redonly status
":set statusline+=\ %#CP_DIV#\|\  "filename divider
:set statusline+=\ %#CP_MID# "set color for middle of SL
:set statusline+=\ %{Ftype()}\ \ %{LEnds()} "filetype
:set statusline+=%= "every statusline addition after this line will be right justified
:set statusline+=%p%%\  "percentage through the file in lines
:set statusline+=%#CP_LNUM#\ L%l:C%c\  "line number and character on that line

set guifont=Operator\ Mono\ Book:h12 "for MacVim

set number "line numbers

filetype plugin indent on "enable indenting
"set tabstop=4 "show existing tabs with 4 spaces width
"set shiftwidth=4 "indent 4 spaces when using > to indent

" change tabs to 4 spaces to coincide with firmware source
set tabstop=4
set softtabstop=4
set shiftwidth=4
set smarttab
set expandtab "this would put in 4 spaces when pressing tab

"fold on markers in scripts, don't fold on markers in other files
"reminder:
"  - open a fold with zo
"  - toggle a fold with za (or zz or Z - see map below)
"  - close a fold with zc
"  - make a fold with zf
"  - delete a fold at cursor with zd
"  - delete a fold recursively at cursor with zD
setlocal foldmethod=syntax
setlocal foldlevelstart=99 "don't automatically fold everything
"setlocal foldnestmax=10
augroup vimrc
    au!
    autocmd BufNewFile,BufRead *.sh,*.zsh-theme,*.vimrc,*.vim,*rc,*.conf  setlocal foldlevel=0 | setlocal foldmethod=marker
augroup END

"use zz or Z to toggle folds
nmap zz za
nmap Z  za

map <F7> <Esc>:tabp<Return>
map <F8> <Esc>:tabn<Return>
map <C-F7> <Esc>:bp<Return>
map <C-F8> <Esc>:bn<Return>
"use tabe instead of tabf, e works the same as :e
map <F9> <Esc>:tabe 

map <F11> <Esc>:bp<Return>
map <F12> <Esc>:bn<Return>

map <F10> <Esc>mp:%s/\([)>a-zA-Z0-9]\) {/\1 {/ge<Return>:%s/{\zs\s\+\ze$//ge<Return>:%s/\([^\s\t ]\)[\s\t ]*\n[\s\t ]*{\(.*\)$/\1 {\r\2/ge<Return>:%s/\r//ge<Return>:%s/}\zs\([^\s\t ;,\])}]\)/ \1/ge<Return>:%s/\(^\\|[\s\t ]\)\/\{2,}<\?!\?\zs\([^!<\s\t ]\)/ \2/ge<Return>:%s/[^\s\t ]\zs{/ {/ge<Return>ggVG=:retab<Return>:w<Return>`p

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

if !has("gui_running")
    set mouse=a
endif
set backspace=indent,eol,start

set runtimepath^=~/.vim/plugin/gitgutter.vim

"enable gitgutter
set updatetime=250

augroup zsh_theme_ft
    au!
    autocmd BufNewFile,BufRead *.zsh-theme  set syntax=zsh
augroup END

"enable hex editing for binary files
"when starting vim with -b, this will edit the file with hex
augroup Binary
    au!
    au BufReadPost * if &bin | %!xxd
    au BufReadPost * set ft=xxd | endif
    au BufWritePre * if &bin | %!xxd -r
    au BufWritePre * endif
    au BufWritePost * if &bin | %!xxd
    au BufWritePost * set nomod | endif
augroup END
