" general config {{{
set laststatus=2
set noshowmode
set t_Co=256
set modeline

" keep 3 lines of context around the cursor
set so=3
set siso=5

"set lbr "wrap properly

" disable wrapping
set nowrap

set lazyredraw

set nrformats=alpha " allow g<C-a> to increment letters

set hidden " see :h hidden
set switchbuf=useopen " see :h switchbuf

set title
set titlestring=%t\ -\ NVIM

if has('persistent_undo')
    set undodir=/tmp/vim-undodir
    set undofile
endif

" splitting {{{
" internal helper for splitting naturally
fu! s:SplitHelper(f)
    if winwidth('%') >= (winheight('%') * 2)
        exec 'vsplit '.a:f
    else
        exec 'split '.a:f
    endif
endfu

" split naturally with 0 or more files (0 == identical to calling either split
" or vsplit, depending on the current window size
fu! SplitNatural(...)
    if a:0 == 0
        call s:SplitHelper('')
    else
        for fname in a:000
            call s:SplitHelper(fname)
        endfor
    endif
endfu

" use :S <filenames...> to open 1 or more splits in a 'natural' way
" this can be used with no args, which is identical to just calling a split
" function
command! -nargs=* -complete=file S call SplitNatural(<f-args>)

set splitright
set splitbelow
" end splitting }}}

if !has("gui_running")
    set mouse=a
endif
set backspace=indent,eol,start

if has('extra_search')
    set hlsearch
endif
" end general config }}}

" functions and such {{{

" source a file only if it exists
function! SourceIfExists(file)
    if filereadable(expand(a:file))
        exe 'source' a:file
    endif
endfunction

"function to strip whitespace from the start/end of a string string
fu! StripSpaces(instr)
    " trim is in neovim and in vim >= 8.0.1630
    if has('nvim') || v:versionlong >= 8001630
        return trim(a:instr)
    else
        return substitute(a:instr, '^\_s*\(.\{-}\)\_s*$', '\1', '')
    endif
endfu

" end functions and stuff }}}

" plugins {{{

let g:plug_window='noautocmd vertical topleft new'
"if vim-plug isn't installed when vim is started, this will install it
if empty(glob('~/.vim/autoload/plug.vim'))
    silent !curl -fLo ~/.vim/autoload/plug.vim --create-dirs
                \ https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
    autocmd VimEnter * PlugInstall --sync | source ~/.vimrc
else
    autocmd VimEnter *
                \  if len(filter(values(g:plugs), '!isdirectory(v:val.dir)'))
                \|   PlugInstall --sync | q
                \| endif
endif

call plug#begin('~/.vim/plugged')
" Plug 'junegunn/fzf', {'do': {->fzf#install()}, 'on': 'FZF'}
Plug 'LnL7/vim-nix', {'for': 'nix'}
Plug 'Xuyuanp/nerdtree-git-plugin', {'on': 'NERDTreeToggle'}
Plug 'adelarsq/vim-matchit'
Plug 'airblade/vim-gitgutter'
Plug 'ctrlpvim/ctrlp.vim'
Plug 'dense-analysis/ale'
Plug 'godlygeek/tabular', {'on': 'Tab'}
Plug 'junegunn/goyo.vim', {'on': 'Goyo'}
Plug 'junegunn/limelight.vim', {'on': 'Limelight'}
Plug 'junegunn/vim-easy-align', {'on': ['EasyAlign', 'LiveEasyAlign']}
Plug 'junegunn/vim-markdown-toc', {'for': 'markdown'}
Plug 'junegunn/vim-slash'
Plug 'ntpeters/vim-better-whitespace'
Plug 'preservim/nerdtree', {'on': 'NERDTreeToggle'}
Plug 'sbdchd/neoformat', {'on': 'Neoformat'}
Plug 'sickill/vim-pasta'
Plug 'tomtom/tcomment_vim'
Plug 'tpope/vim-surround'
Plug 'troydm/zoomwintab.vim', {'on': ['ZoomWinTabIn', 'ZoomWinTabOut', 'ZoomWinTabToggle']}
Plug 'whatyouhide/vim-lengthmatters'
call plug#end()

"enable gitgutter
set updatetime=250

"NERDTree settings
nnoremap <C-n> :NERDTreeToggle<CR>
autocmd BufEnter * if (winnr("$") == 1 && exists("b:NERDTree") && b:NERDTree.isTabTree()) | q | endif
autocmd BufEnter * if bufname('#') =~# "^NERD_tree_" && winnr('$') > 1 | b# | endif
let g:NERDTreeMinimalUI=1
let g:NERDTreeDirArrowExpandable='▸'
let g:NERDTreeDirArrowCollapsible='▾'
set wildignore+=*.so,*.swp,*.zip

"ALE
let g:ale_completion_enabled=1

"ctrlp.vim
set wildmode=list:longest,list:full
set wildignore+=*.o,*.obj,.git
let g:ctrlp_custom_ignore = '\v[\/](node_modules|target|dist)|(\.(swp|tox|ico|git|hg|svn))$'
let g:ctrlp_user_command = "find %s -type f | grep -Ev '"+ g:ctrlp_custom_ignore +"'"
let g:ctrlp_use_caching = 1

"FZF
"let g:fzf_layout = {'window': {'width': 0.9, 'height': 0.6, 'border': 'sharp'}}

"if the silver searcher is installed
if executable('ag')
    set grepprg=ag\ --nogroup\ --nocolor
    let g:ctrlp_user_command='ag %s -l --nocolor -g ""'
    let g:ctrlp_use_caching=0
endif

let g:ctrlp_cache_dir=$HOME . '/.cache/ctrlp'

"limelight
let g:limelight_conceal_ctermfg=1

"enable limelight for goyo
autocmd! User GoyoEnter Limelight
autocmd! User GoyoLeave Limelight!

"easy align
nmap ga <Plug>(EasyAlign)
xmap ga <Plug>(EasyAlign)

" end plugins }}}

" highlighting/colors {{{
let g:go_highlight_array_whitespace_error = 0
let g:go_highlight_chan_whitespace_error = 0
let g:go_highlight_extra_types = 0
let g:go_highlight_space_tab_error = 0
let g:go_highlight_trailing_whitespace_error = 0

syntax enable "syntax hilighting
set background=dark
set termguicolors

let g:gruvbox_italic=1
let g:gruvbox_invert_selection=0

colorscheme gruvbox

" setup italics in terminal
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

" {{{ status line/tabs colors
highlight CP_MODE guibg=#3c3836 guifg=#928374 gui=bold
highlight CP_FNAME guibg=#3c3836 guifg=#ebdbb2 gui=italic
highlight CP_MID guibg=#3c3836 guifg=#928374
highlight CP_LNUM guibg=#3c3836 guifg=#ebdbb2

"I have termguicolors on, but if this causes issues this can be enabled again
if !has("gui_running")
    highlight CP_MODE ctermbg=237 ctermfg=245 cterm=bold
    highlight CP_FNAME ctermbg=237 ctermfg=223 cterm=italic
    highlight CP_MID ctermbg=237 ctermfg=245
    highlight CP_LNUM ctermbg=237 ctermfg=223
endif
" }}} end status line/tab bar

" end highlighting }}}

" statusline fields {{{

" supporting functions {{{
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
            \ 't'  : 'T',
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
    let l:format = substitute(&fileformat, "[[]]", "", "")
    return l:format
endfunction

"git status
fu! GitStatus()
    let [a,m,r] = GitGutterGetHunkSummary()
    let str = ''

    if a > 0
        let str .= printf(' +%d', a)
    endif

    if m > 0
        let str .= printf(' ~%d', m)
    endif

    if r > 0
        let str .= printf(' -%d', r)
    endif

    if len(str) > 0
        return printf(' [%s] ', StripSpaces(str))
    else
        return str
    endif
endfu
" end supporting functions }}}

"statusline
:set statusline=%#CP_MODE#\ %{toupper(g:currentmode[mode()])}\  "shows mode
:set statusline+=%< "where to truncate the line, in other words always show mode
:set statusline+=\ %#CP_LNUM#%n: " buffer number
:set statusline+=%{ReadOnly()} "readonly status
:set statusline+=%#CP_FNAME#\ %f "filename
:set statusline+=%{Modstatus()} "modified status of buffer
:set statusline+=\ %#CP_MID# "set color for middle of SL
:set statusline+=\ %{Ftype()}\ \ %{LEnds()} "filetype
:set statusline+=%= "every statusline addition after this line will be right justified
:set statusline+=%{GitStatus()} "git information
:set statusline+=\ %p%%\  "percentage through the file in lines
:set statusline+=%#CP_LNUM#\ L%l:C%c\  "line number and character on that line

" end statusline fields }}}

" tabs, folds, line numbers, font {{{

set guifont=Operator\ Mono\ Book:h12 "for MacVim

set nu rnu "relative line numbers

set cursorline

filetype plugin indent on "enable indenting

set tabstop=4
set softtabstop=4
set shiftwidth=4
set smarttab
set expandtab

"fold on markers in scripts, don't fold on markers in other files
"reminder:
"  - open a fold with zo
"  - toggle a fold with za (or Z - see map below)
"  - close a fold with zc
"  - make a fold with zf
"  - delete a fold at cursor with zd
"  - delete a fold recursively at cursor with zD
set foldmethod=syntax
set foldlevelstart=99 "don't automatically fold everything
"setlocal foldnestmax=10

" end tabs, folds, and line numbers }}}

" keybinds {{{

"press escape to exit insert mode in terminal to be able to switch windows
tnoremap <Esc> <C-\><C-n>
tmap <C-w> <Esc><C-w>

"switch windows with <Tab> followed by a direction
nnoremap <Tab> <C-w>

"use Z to toggle folds
nmap Z  za
"also use ;z to toggle folds
nmap ;z za

" sort using control-s, reverse sort using control-shift-s
" doesn't work right now for some reason, too lazy to fix
vnoremap <C-s> :'<,'>sort<Return>
vnoremap <C-S> :'<,'>sort!<Return>

" copy to clipboard in visual mode with c-y
if has('clipboard')
    vnoremap <C-y> "+y<Return>
endif

nnoremap g= :retab<Return>mvgg=G`v

nnoremap <C-Up> "ldd2k"Lp
nnoremap <C-Down> "ldd"Lp
nmap <C-k> <C-Up>
nmap <C-j> <C-Down>

map <F7> <Esc>:tabp<Return>
map <F8> <Esc>:tabn<Return>
"use tabe instead of tabf, e works the same as :e
map <F9> <Esc>:tabe
map <C-F7> <Esc>:bp<Return>
map <C-F8> <Esc>:bn<Return>

map <F11> <Esc>:bp<Return>
map <F12> <Esc>:bn<Return>

map <F10> <Esc>mp:%s/\([)>a-zA-Z0-9]\) {/\1 {/ge<Return>:%s/{\zs\s\+\ze$//ge<Return>:%s/\([^\s\t ]\)[\s\t ]*\n[\s\t ]*{\(.*\)$/\1 {\r\2/ge<Return>:%s/\r//ge<Return>:%s/}\zs\([^\s\t ;,\])}]\)/ \1/ge<Return>:%s/\(^\\|[\s\t ]\)\/\{2,}<\?!\?\zs\([^!<\s\t ]\)/ \2/ge<Return>:%s/[^\s\t ]\zs{/ {/ge<Return>gg=G:retab<Return>`p

" use F1 to look up help pages and man pages
nmap <F1> K

vnoremap < <gv
vnoremap > >gv

"compile
map <F2> <Esc>:make<Return>
"open error list
map <F3> <Esc>:copen<Return>
"previous error
map <F4> <Esc>:cprevious<Return>
"next error
map <F5> <Esc>:cnext<Return>
"close error output
map <F6> <Esc>:cclose<Return>

" end keybinds }}}

" compiling {{{
"java compilation stuff
"autocmd Filetype java set makeprg=cd\ '%:h'\ &&\ javac\ '%:t'
"autocmd Filetype java set errorformat=%A%f:%l:\ %m,%-Z%p^,%-C%.%#
"c compilation stuff
"autocmd Filetype c set makeprg=gcc\ -o\ '%<'.out\ '%'
"c++ compilation stuff
"autocmd Filetype cpp,c++ set makeprg=g++\ -o\ '%<'.out\ '%'\ -std=c++17

" end compiling }}}

" autogroups/commands {{{
" set up foldmethods and text widths based on filetypes
augroup vimrc
    au!
    autocmd BufNewFile,BufRead Makefile,*.mk,*.sh,*.zsh-theme,*.vimrc,*.vim,*rc,*.conf  setlocal foldlevel=0 | setlocal foldmethod=marker
    autocmd BufNewFile,BufRead *.tex,*.md,*.txt,*.rtf,README setlocal textwidth=80
augroup END

" disable bells
autocmd GUIEnter * set vb t_vb=

augroup zsh_theme_ft
    au!
    autocmd BufNewFile,BufRead *.zsh-theme  setlocal filetype=zsh
augroup END

augroup arduino_ino
    au!
    autocmd BufNewFile,BufRead *.ino  setlocal filetype=cpp
augroup END

augroup vifm_ft
    au!
    autocmd BufNewFile,BufRead *.vifm,vifm*  setlocal ft=vim
augroup END

" I want section 2 before second 3
" Example: open() -> open(3pm) which is in the perl manual
" I want open(2)
autocmd BufNewFile,BufRead * let b:man_default_sects='2,3'

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

" end autogroups/commands }}}

" completion {{{
set completeopt+=preview
set completeopt+=menuone
set completeopt+=noinsert
set shortmess+=c

"set complete=.,b,u,]
"set wildmode=longest,list:longest
"set completeopt=menu,preview

" end completion }}}
