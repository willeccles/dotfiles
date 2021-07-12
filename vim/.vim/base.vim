set laststatus=2
set modeline
set noruler

set so=3
set siso=3

set nowrap

set tw=80
set colorcolumn=81

set fo=tjcrqln1

set lazyredraw

set nrformats=alpha,bin,hex,octal

set hidden
set switchbuf=useopen

set splitright
set splitbelow

set title
" overridden in init.vim for nvim
set titlestring=%t\ -\ VIM

if has('persistent_undo')
  set undodir=/tmp/vim-undodir
  set undofile
endif

if !has("gui_running")
  set mouse=a
endif

set backspace=indent,eol,start

if has('extra_search')
  set hlsearch
endif

set updatetime=500

if executable('ag')
  set grepprg=ag\ --vimgrep\ $*
  set grepformat=%f:%l:%c:%m
endif

set guifont=Operator\ Mono\ Book:h12

set rnu
set nu

set cursorline

filetype plugin indent on

set tabstop=2
set softtabstop=2
set shiftwidth=2
set smarttab
set expandtab

set cino=h1,l1,g1,t0,i4,+4,(0,w1,W4,E-s,N-s

set completeopt+=preview
set completeopt+=menuone
set completeopt+=noinsert
set completeopt+=longest
set shortmess+=c

let g:vim_json_warnings=0

set listchars=tab:-->,trail:+,nbsp:+
set list

if executable('wsl-clip')
  let g:clipboard = {
        \ 'name': 'wsl-clip',
        \ 'copy': {
          \ '+': 'wsl-clip copy',
          \ '*': 'wsl-clip copy',
        \ },
        \ 'paste': {
          \ '+': 'wsl-clip paste',
          \ '*': 'wsl-clip paste',
        \ },
        \ 'cache-enabled': 0,
        \}
endif

"set langmap='dg,ek,fe,gt,il,jy,kn,lu,nj,pr,rs,sd,tf,ui,yo,o\;,\;p,DG,EK,FE,GT,IL,JY,KN,LU,NJ,PR,RS,SD,TF,UI,YO,O:,:P'
"set nolangremap
