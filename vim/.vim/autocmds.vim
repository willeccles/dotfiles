augroup vimrc
  au!
  autocmd BufNewFile,BufRead Makefile,*.mk,*.sh,*.zsh-theme,*.vimrc,*.vim,*rc,*.conf  setl foldlevel=0 foldmethod=marker
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

autocmd BufNewFile,BufRead *.c,*.h,*.cpp,*.hpp,*.cc let b:man_default_sects='2,3'

autocmd BufNewFile,BufRead *.dot,*.dts,*.dtsi setl tw=0 colorcolumn=

autocmd BufNewFile,BufRead Kbuild setlocal ft=make

autocmd BufNewFile,BufRead * setl fo-=o

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

