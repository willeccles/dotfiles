" general config {{{
set laststatus=2
set noshowmode
set t_Co=256
set modeline

set noruler

" keep 3 lines of context around the cursor
set so=3
set siso=5

"set lbr "wrap properly

" disable wrapping
set nowrap

set tw=80
" see fo-table
set fo=tjcroqln1

set lazyredraw

set nrformats=alpha " allow g<C-a> to increment letters

set hidden " see :h hidden
set switchbuf=useopen " see :h switchbuf

set title
if has('nvim')
  set titlestring=%t\ -\ NVIM
else
  set titlestring=%t\ -\ VIM
endif

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

" TODO: finish this, rather than using the gross spacevim plugin thing
" testing for todo listing
fu! ShowTodos(...)
    if a:0 == 0
        " use the current buffer
        silent exec 'lgrep!' 'TODO' fnameescape(expand('%'))
    else
        " search through all args
        silent exec 'lgrep!' 'TODO' join(map(copy(a:000), 'fnameescape(v:val)'))
    endif
    lopen
    " echo getloclist(0)
    " for todo in getloclist(0)
    "   echo expand('#' . todo["bufnr"] . ':t') . ':' . todo["lnum"] . ':' . todo["col"] . ': ' . todo["text"][todo["col"]-1:]
    " endfor
endfu

command! -nargs=* -complete=file ShowTodos call ShowTodos(<f-args>)


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
Plug 'LnL7/vim-nix', {'for': 'nix'}
Plug 'Xuyuanp/nerdtree-git-plugin', {'on': 'NERDTreeToggle'}
Plug 'adelarsq/vim-matchit'
Plug 'airblade/vim-gitgutter'
Plug 'ctrlpvim/ctrlp.vim'
Plug 'dense-analysis/ale'
Plug 'godlygeek/tabular'
Plug 'junegunn/goyo.vim', {'on': 'Goyo'}
Plug 'junegunn/limelight.vim', {'on': 'Limelight'}
Plug 'junegunn/vim-easy-align', {'on': ['EasyAlign', 'LiveEasyAlign']}
Plug 'junegunn/vim-markdown-toc', {'for': 'markdown'}
Plug 'junegunn/vim-slash'
Plug 'justinmk/vim-sneak'
Plug 'machakann/vim-highlightedyank'
Plug 'ntpeters/vim-better-whitespace'
Plug 'preservim/nerdtree', {'on': 'NERDTreeToggle'}
Plug 'sickill/vim-pasta'
Plug 'tomtom/tcomment_vim'
Plug 'tpope/vim-surround'
Plug 'unblevable/quick-scope'
Plug 'whatyouhide/vim-lengthmatters', {'on': ['LengthmattersToggle', 'LengthmattersEnable']}
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
let g:ale_pattern_options = { '\.h$': {'ale_linters': ['ccls', 'clang', 'clangcheck', 'clangd', 'clangtidy', 'clazy', 'cppcheck', 'cpplint', 'cquery', 'flawfinder', 'gcc'] } }
let g:ale_c_cc_options='-Wall -pedantic -std=c11 -D_DEFAULT_SOURCE -D_XOPEN_SOURCE=700'
let g:ale_hover_cursor=0
let g:ale_lint_on_text_changed=0
let g:ale_lint_on_insert_leave=0
let g:ale_lint_on_save=1

"ctrlp.vim
set wildmode=list:longest,list:full
set wildignore+=*.o,*.obj,.git
let g:ctrlp_custom_ignore = '\v[\/](node_modules|target|dist)|(\.(swp|tox|ico|git|hg|svn))$'
let g:ctrlp_user_command = "find %s -type f | grep -Ev '"+ g:ctrlp_custom_ignore +"'"
let g:ctrlp_use_caching = 1
let g:ctrlp_cache_dir=$HOME . '/.cache/ctrlp'

"if the silver searcher is installed
if executable('ag')
  "set grepprg=ag\ --nogroup\ --nocolor
  set grepprg=ag\ --vimgrep\ $*
  set grepformat=%f:%l:%c:%m
  let g:ctrlp_user_command='ag %s -l --nocolor -g ""'
  let g:ctrlp_use_caching=0
endif

"limelight
let g:limelight_conceal_ctermfg=1

"enable limelight for goyo
autocmd! User GoyoEnter Limelight
autocmd! User GoyoLeave Limelight!

"goyo
let g:goyo_width=81

"easy align
nmap ga <Plug>(EasyAlign)
xmap ga <Plug>(EasyAlign)

"quick-scope
let g:qs_highlight_on_keys = ['f', 'F', 't', 'T']

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
highlight CP_MANBAR guibg=#3c3836 guifg=#ebdbb2

"I have termguicolors on, but if this causes issues this can be enabled again
"if !has("gui_running")
"    highlight CP_MODE ctermbg=237 ctermfg=245 cterm=bold
"    highlight CP_FNAME ctermbg=237 ctermfg=223 cterm=italic
"    highlight CP_MID ctermbg=237 ctermfg=245
"    highlight CP_LNUM ctermbg=237 ctermfg=223
"endif
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
  let str = substitute(&filetype, "[[]]", "", "")
  if len(str) > 0
    return printf(' %s ', str)
  else
    return str
  endif
endfunction

"line endings
fu! LEnds()
  let l:format = substitute(&fileformat, "[[]]", "", "")
  return l:format
endfunction

"git status
fu! GitStatus()
  if !exists("*GitGutterGetHunkSummary")
    return ""
  endif

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
:set statusline+=%{Ftype()}\ %{LEnds()} "filetype
:set statusline+=%= "every statusline addition after this line will be right justified
:set statusline+=%{GitStatus()} "git information
:set statusline+=\ %p%%\  "percentage through the file in lines
:set statusline+=%#CP_LNUM#\ L%l:C%c\  "line number and character on that line

" end statusline fields }}}

" tabs, folds, line numbers, font {{{

set guifont=Operator\ Mono\ Book:h12 "for MacVim

set rnu "relative line numbers
set nu "show current line number as well

set cursorline

filetype plugin indent on "enable indenting

set tabstop=2
set softtabstop=2
set shiftwidth=2
set smarttab
set expandtab

" see cinoptions-values
"set cino=ws,l1,j1,J1,g2,h2,E-s
set cino=h1,l1,g1,t0,i4,+4,(0,w1,W4,E-s

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
nnoremap <silent> <C-s> vip:sort<CR>
nnoremap <silent> <M-s> vip:sort!<CR>

" copy to clipboard in visual mode with c-y
if has('clipboard')
  vnoremap <C-y> "+y<CR>
endif

nnoremap g= :retab<CR>mvgg=G`v

nnoremap <C-Up> "lddk"LP
nnoremap <C-Down> "ldd"Lp
nmap <C-k> <C-Up>
nmap <C-j> <C-Down>

map <silent> <F7> <Esc>:tabp<CR>
map <silent> <F8> <Esc>:tabn<CR>
"use tabe instead of tabf, e works the same as :e
map <F9> <Esc>:tabe<Space>
map <silent> <C-F7> <Esc>:bp<CR>
map <silent> <C-F8> <Esc>:bn<CR>

map <silent> <F11> <Esc>:bp<CR>
map <silent> <F12> <Esc>:bn<CR>

map <silent> <F10> <Esc>mp:%s/\([)>a-zA-Z0-9]\) {/\1 {/ge<CR>:%s/{\zs\s\+\ze$//ge<CR>:%s/\([^\s\t ]\)[\s\t ]*\n[\s\t ]*{\(.*\)$/\1 {\r\2/ge<CR>:%s/\r//ge<CR>:%s/}\zs\([^\s\t ;,\])}]\)/ \1/ge<CR>:%s/\(^\\|[\s\t ]\)\/\{2,}<\?!\?\zs\([^!<\s\t ]\)/ \2/ge<CR>:%s/[^\s\t ]\zs{/ {/ge<CR>gg=G:retab<CR>`p

" use F1 to look up help pages and man pages
nmap <F1> K

vnoremap < <gv
vnoremap > >gv

"compile
map <silent> <F2> <Esc>:make<CR>
"open error list
map <silent> <F3> <Esc>:copen<CR>
"previous error
map <silent> <F4> <Esc>:cprevious<CR>
"next error
map <silent> <F5> <Esc>:cnext<CR>
"close error output
map <silent> <F6> <Esc>:cclose<CR>

let mapleader=";"

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
  "autocmd BufNewFile,BufRead *.tex,*.md,*.txt,*.rtf,README setlocal textwidth=80
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
autocmd BufNewFile,BufRead *.c,*.h,*.cpp,*.hpp,*.cc let b:man_default_sects='2,3'

"enable hex editing for binary files
"when starting vim with -b, this will edit the file with hex
if executable('xxd')
  augroup Binary
    au!
    au BufReadPost * if &bin | %!xxd
    au BufReadPost * set ft=xxd | endif
    au BufWritePre * if &bin | %!xxd -r
    au BufWritePre * endif
    au BufWritePost * if &bin | %!xxd
    au BufWritePost * set nomod | endif
  augroup END
endif

" end autogroups/commands }}}

" completion {{{
set completeopt+=preview
set completeopt+=menuone
set completeopt+=noinsert
set completeopt+=longest
set shortmess+=c

"set complete=.,b,u,]
"set wildmode=longest,list:longest
"set completeopt=menu,preview

" end completion }}}
