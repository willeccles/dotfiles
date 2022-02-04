" source base config
exe 'source' "~/.vim/base.vim"

" general config {{{

set noshowmode
set t_Co=256

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

" end splitting }}}

" clang-format command {{{

fu! ClangFormatStyles(A, L, P)
  return "LLVM\nGNU\nGoogle\nChromium\nMicrosoft\nMozilla\nWebKit"
endfu

fu! ClangFormatCmd(bang, mods, ...) range
  let args = '--lines=' . a:firstline . ':' . a:lastline
        \ . ' --assume-filename=' . shellescape(expand('%:t'))
  if a:0
    silent exe '%!clang-format ' . args . ' --style=' . shellescape(a:1) . ' --'
  else
    if empty(a:bang)
      silent exe '%!clang-format ' . args . ' --style=file --fallback-style=Google --'
    else
      silent exe '%!clang-format ' . args . ' --style=file --'
    endif
  endif

  call cursor(a:firstline, 1)
  if stridx(a:mods, "silent") == -1
    let count = a:lastline - a:firstline + 1
    if count > 1
      echo printf("Formatted %d lines", count)
    else
      echo printf("Formatted %d line", count)
    endif
  endif
endfu

" use :{range}ClangFormat to run clang-format on a range
" optionally specify a style as the first arg or it will use --style=file to use
" a .clang-format file with a fallback of Google if no file is found
" if a bang (!) is given, no fallback style will be used
" also supports :silent
command! -nargs=? -range=% -bang -complete=custom,ClangFormatStyles ClangFormat
      \ <line1>,<line2>call ClangFormatCmd(<q-bang>, <q-mods>, <f-args>)

" end clang-format command }}}

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
Plug 'LnL7/vim-nix', {'for': 'nix'}
Plug 'Xuyuanp/nerdtree-git-plugin', {'on': 'NERDTreeToggle'}
Plug 'adelarsq/vim-matchit'
Plug 'airblade/vim-gitgutter'
Plug 'ctrlpvim/ctrlp.vim'
"Plug 'dense-analysis/ale'
Plug 'godlygeek/tabular'
Plug 'junegunn/goyo.vim', {'on': 'Goyo'}
Plug 'junegunn/limelight.vim', {'on': 'Limelight'}
Plug 'junegunn/vim-easy-align', {'on': ['EasyAlign', 'LiveEasyAlign']}
Plug 'junegunn/vim-slash'
Plug 'justinmk/vim-sneak'
Plug 'machakann/vim-highlightedyank'
Plug 'mzlogin/vim-markdown-toc', {'for': 'markdown', 'tag': '*'}
Plug 'ntpeters/vim-better-whitespace'
Plug 'preservim/nerdtree', {'on': 'NERDTreeToggle'}
Plug 'sickill/vim-pasta'
Plug 'tomtom/tcomment_vim'
Plug 'tpope/vim-fugitive'
Plug 'tpope/vim-surround'
Plug 'unblevable/quick-scope'
Plug 'whatyouhide/vim-lengthmatters'
Plug 'zhimsel/vim-stay'

if has('nvim-0.5.0')
  if executable('tree-sitter')
    "Plug 'nvim-treesitter/nvim-treesitter', {'do': ':TSUpdate'}
  endif
  "Plug 'folke/which-key.nvim'
endif

call plug#end()

if has('nvim-0.5.0')
  "lua require('cactus.config')
endif

set runtimepath+=~/git/vim-cactodo

"make gitgutter faster
" set updatetime=250
"also, disable gitgutter in diff mode (if I'm viewing a diff, there's a good
"chance I don't need to see git information)
if &diff
  let g:gitgutter_enabled=0
endif

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
let g:ale_pattern_options = { '\.h$': {'ale_linters': ['clangd', 'ccls', 'clang', 'clangcheck', 'clangtidy', 'clazy', 'cppcheck', 'cpplint', 'cquery', 'flawfinder', 'gcc'] } }
let g:ale_c_cc_options='-Wall -pedantic -std=c11 -D_DEFAULT_SOURCE -D_XOPEN_SOURCE=700'
let g:ale_cpp_cc_options='-Wall -pedantic -std=c++20 -D_DEFAULT_SOURCE -D_XOPEN_SOURCE=700'
let g:ale_cache_executable_check_failures=1
let g:ale_c_parse_compile_commands=1
let g:ale_cpp_parse_compile_commands=1
let g:ale_hover_cursor=0
" let g:ale_floating_preview=1
let g:ale_cursor_detail=0
" let g:ale_close_preview_on_insert=1
"since LSP sucks, these options are useless with completion enabled
let g:ale_lint_on_text_changed=0
let g:ale_lint_on_insert_leave=0
let g:ale_lint_on_save=1

"ctrlp.vim
"set wildmode=list:longest,list:full
set wildignore+=*.o,*.obj,.git
let g:ctrlp_custom_ignore = '\v[\/](node_modules|target|dist)|(\.(swp|tox|ico|git|hg|svn))$'
let g:ctrlp_user_command = "find %s -type f | grep -Ev '"+ g:ctrlp_custom_ignore +"'"
let g:ctrlp_use_caching = 1
let g:ctrlp_cache_dir=$HOME . '/.cache/ctrlp'

"if the silver searcher is installed
if executable('ag')
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

"vim-lengthmatters
let g:lengthmatters_on_by_default=0

"vim-stay
set viewoptions=cursor,folds,slash,unix

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

let g:gruvbox_italic=0
let g:gruvbox_invert_selection=0

colorscheme gruvbox

" setup italics in terminal
" if !has("gui_running")
"   set t_ZH=[3m
"   set t_ZR=[23m
" endif

" change the cursors if we are in the terminal
if !has("gui_running")
  if !has('nvim')
    let &t_SI.="\e[5 q"
    let &t_SR.="\e[4 q"
    let &t_EI.="\e[1 q"
  else
    set guicursor=n-v-c-sm:block,i-ci-ve:ver25,r-cr-o:hor20
  endif
endif

highlight ColorColumn guibg=#32302f

"vim-lengthmatters
call lengthmatters#highlight('guibg=#cc241d')

"vim-better-whitespace
highlight ExtraWhitespace guibg=#fb4934

" {{{ status line/tabs colors

"default status line colors which have to be specified because this is compared
"with StatusLineNC when falling back to that
highlight StatusLine guibg=#3c3836 guifg=#ebdbb2
"non-focused status line colors to fall back to when User1..2 aren't used
highlight StatusLineNC guibg=#32302f guifg=#bdae93

"use these with %1* and %2*
highlight User1 guibg=#3c3836 guifg=#928374
highlight User2 guibg=#3c3836 guifg=#ebdbb2

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
set statusline=%1*\ %{toupper(g:currentmode[mode()])}\  "shows mode
set statusline+=%< "where to truncate the line, in other words always show mode
set statusline+=\ %2*%n: " buffer number
set statusline+=%{ReadOnly()} "readonly status
set statusline+=\ %f "filename
set statusline+=%{Modstatus()} "modified status of buffer
"set statusline+=\ %#CP_MID# "set color for middle of SL
set statusline+=\ %1*%{Ftype()}\ %{LEnds()} "filetype
set statusline+=%= "every statusline addition after this line will be right justified
set statusline+=%{GitStatus()} "git information
set statusline+=\ %p%%\  "percentage through the file in lines
set statusline+=%2*\ %l:%c\  "line number and character on that line

" end statusline fields }}}

" source keybinds
exe 'source' "~/.vim/binds.vim"

" finally, autocommands
exe 'source' "~/.vim/autocmds.vim"
