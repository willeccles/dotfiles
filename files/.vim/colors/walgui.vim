hi clear
set background=dark

if exists('syntax_on')
    syntax reset
endif

" Colorscheme name
let g:colors_name = 'walgui'

" highlight groups {{{

exe 'hi Normal guibg=' . g:scheme_background . ' guifg=' . g:scheme_color7
exe 'hi NonText guibg=NONE guifg=' . g:scheme_color0
exe 'hi Comment guibg=NONE guifg=' . g:scheme_color8 . ' gui=italic'
exe 'hi Constant guibg=NONE guifg=' . g:scheme_color3
exe 'hi Error guibg=' . g:scheme_color1 . ' guifg=' . g:scheme_color7
exe 'hi Identifier guibg=NONE guifg=' . g:scheme_color1 . ' gui=BOLD'
exe 'hi Ignore guibg=' . g:scheme_color8 . ' guifg=' . g:scheme_color0
exe 'hi PreProc guibg=NONE guifg=' . g:scheme_color3
exe 'hi Special guibg=NONE guifg=' . g:scheme_color6
exe 'hi Statement guibg=NONE guifg=' . g:scheme_color1
exe 'hi String guibg=NONE guifg=' . g:scheme_color2
exe 'hi Number guibg=NONE guifg=' . g:scheme_color3
exe 'hi Todo guibg=' . g:scheme_color2 . ' guifg=' . g:scheme_color0
exe 'hi Type guibg=NONE guifg=' . g:scheme_color3
exe 'hi Underlined guibg=NONE guifg=' . g:scheme_color1 . ' gui=underline'
exe 'hi StatusLine guibg=' . g:scheme_color7 . ' guifg=' . g:scheme_color0
exe 'hi StatusLineNC guibg=' . g:scheme_color8 . ' guifg=' . g:scheme_color0
exe 'hi TabLine guibg=NONE guifg=NONE gui=NONE'
exe 'hi TabLineFill guibg=' . g:scheme_color0 . ' guifg=' . g:scheme_color8 . ' gui=NONE'
exe 'hi TabLineSel guibg=' . g:scheme_color8 . ' guifg=' . g:scheme_color0 . ' gui=BOLD'
exe 'hi TermCursorNC guibg=' . g:scheme_color3 . ' guifg=' . g:scheme_color0
exe 'hi VertSplit guibg=' . g:scheme_color8 . ' guifg=' . g:scheme_color0
exe 'hi Title guibg=NONE guifg=' . g:scheme_color4
exe 'hi CursorLine gui=NONE guibg=' . g:scheme_color8 . ' guifg=' . g:scheme_color0
exe 'hi LineNr guibg=NONE guifg=' . g:scheme_color8
exe 'hi CursorLineNr guibg=NONE guifg=' . g:scheme_color8
exe 'hi helpLeadBlank guibg=NONE guifg=' . g:scheme_color7
exe 'hi helpNormal guibg=NONE guifg=' . g:scheme_color7
exe 'hi Visual guibg=' . g:scheme_color0 . ' guifg=' . g:scheme_color15 . ' gui=reverse term=reverse'
exe 'hi VisualNOS guibg=NONE guifg=' . g:scheme_color1
exe 'hi Pmenu guibg=' . g:scheme_color8 . ' guifg=' . g:scheme_color7
exe 'hi PmenuSbar guibg=' . g:scheme_color6 . ' guifg=' . g:scheme_color7
exe 'hi PmenuSel guibg=' . g:scheme_color4 . ' guifg=' . g:scheme_color0
exe 'hi PmenuThumb guibg=' . g:scheme_color8 . ' guifg=' . g:scheme_color8
exe 'hi FoldColumn guibg=NONE guifg=' . g:scheme_color7
exe 'hi Folded guibg=NONE guifg=' . g:scheme_color8
exe 'hi WildMenu guibg=' . g:scheme_color2 . ' guifg=' . g:scheme_color0
exe 'hi SpecialKey guibg=NONE guifg=' . g:scheme_color8
exe 'hi DiffAdd guibg=NONE guifg=' . g:scheme_color2
exe 'hi DiffChange guibg=NONE guifg=' . g:scheme_color8
exe 'hi DiffDelete guibg=NONE guifg=' . g:scheme_color1
exe 'hi DiffText guibg=NONE guifg=' . g:scheme_color4
exe 'hi IncSearch guibg=' . g:scheme_color3 . ' guifg=' . g:scheme_color0
exe 'hi Search guibg=' . g:scheme_color3 . ' guifg=' . g:scheme_color0
exe 'hi Directory guibg=NONE guifg=' . g:scheme_color4
exe 'hi MatchParen guibg=' . g:scheme_color8 . ' guifg=' . g:scheme_color0
exe 'hi ColorColumn guibg=' . g:scheme_color4 . ' guifg=' . g:scheme_color0
exe 'hi signColumn guibg=NONE guifg=' . g:scheme_color4
exe 'hi ErrorMsg guibg=NONE guifg=' . g:scheme_color8
exe 'hi ModeMsg guibg=NONE guifg=' . g:scheme_color2
exe 'hi MoreMsg guibg=NONE guifg=' . g:scheme_color2
exe 'hi Question guibg=NONE guifg=' . g:scheme_color4
exe 'hi WarningMsg guibg=' . g:scheme_color1 . ' guifg=' . g:scheme_color0
exe 'hi Cursor guibg=' . g:scheme_cursor . ' guifg=' . g:scheme_color0
exe 'hi Structure guibg=NONE guifg=' . g:scheme_color5
exe 'hi CursorColumn guibg=' . g:scheme_color8 . ' guifg=' . g:scheme_color7
exe 'hi ModeMsg guibg=NONE guifg=' . g:scheme_color7
exe 'hi SpellBad guibg=NONE guifg=' . g:scheme_color1 . ' gui=underline'
exe 'hi SpellCap guibg=NONE guifg=' . g:scheme_color4 . ' gui=underline'
exe 'hi SpellLocal guibg=NONE guifg=' . g:scheme_color5 . ' gui=underline'
exe 'hi SpellRare guibg=NONE guifg=' . g:scheme_color6 . ' gui=underline'
exe 'hi Boolean guibg=NONE guifg=' . g:scheme_color5
exe 'hi Character guibg=NONE guifg=' . g:scheme_color1
exe 'hi Conditional guibg=NONE guifg=' . g:scheme_color5
exe 'hi Define guibg=NONE guifg=' . g:scheme_color5
exe 'hi Delimiter guibg=NONE guifg=' . g:scheme_color5
exe 'hi Float guibg=NONE guifg=' . g:scheme_color5
exe 'hi Include guibg=NONE guifg=' . g:scheme_color4
exe 'hi Keyword guibg=NONE guifg=' . g:scheme_color5
exe 'hi Label guibg=NONE guifg=' . g:scheme_color3
exe 'hi Operator guibg=NONE guifg=' . g:scheme_color7
exe 'hi Repeat guibg=NONE guifg=' . g:scheme_color3
exe 'hi SpecialChar guibg=NONE guifg=' . g:scheme_color5
exe 'hi Tag guibg=NONE guifg=' . g:scheme_color3
exe 'hi Typedef guibg=NONE guifg=' . g:scheme_color3
exe 'hi vimUserCommand guibg=NONE guifg=' . g:scheme_color1 . ' gui=BOLD'
    hi link vimMap vimUserCommand
    hi link vimLet vimUserCommand
    hi link vimCommand vimUserCommand
    hi link vimFTCmd vimUserCommand
    hi link vimAutoCmd vimUserCommand
    hi link vimNotFunc vimUserCommand
exe 'hi vimNotation guibg=NONE guifg=' . g:scheme_color4
exe 'hi vimMapModKey guibg=NONE guifg=' . g:scheme_color4
exe 'hi vimBracket guibg=NONE guifg=' . g:scheme_color7
exe 'hi vimCommentString guibg=NONE guifg=' . g:scheme_color8
exe 'hi htmlLink guibg=NONE guifg=' . g:scheme_color1 . ' gui=underline'
exe 'hi htmlBold guibg=NONE guifg=' . g:scheme_color3 . ' gui=BOLD'
exe 'hi htmlItalic guibg=NONE guifg=' . g:scheme_color5
exe 'hi htmlEndTag guibg=NONE guifg=' . g:scheme_color7
exe 'hi htmlTag guibg=NONE guifg=' . g:scheme_color7
exe 'hi htmlTagName guibg=NONE guifg=' . g:scheme_color1 . ' gui=BOLD'
exe 'hi htmlH1 guibg=NONE guifg=' . g:scheme_color7
    hi link htmlH2 htmlH1
    hi link htmlH3 htmlH1
    hi link htmlH4 htmlH1
    hi link htmlH5 htmlH1
    hi link htmlH6 htmlH1
exe 'hi cssMultiColumnAttr guibg=NONE guifg=' . g:scheme_color2
    hi link cssFontAttr cssMultiColumnAttr
    hi link cssFlexibleBoxAttr cssMultiColumnAttr
exe 'hi cssBraces guibg=NONE guifg=' . g:scheme_color7
    hi link cssAttrComma cssBraces
exe 'hi cssValueLength guibg=NONE guifg=' . g:scheme_color7
exe 'hi cssUnitDecorators guibg=NONE guifg=' . g:scheme_color7
exe 'hi cssValueNumber guibg=NONE guifg=' . g:scheme_color7
    hi link cssValueLength cssValueNumber
exe 'hi cssNoise guibg=NONE guifg=' . g:scheme_color8
exe 'hi cssTagName guibg=NONE guifg=' . g:scheme_color1
exe 'hi cssFunctionName guibg=NONE guifg=' . g:scheme_color4
exe 'hi scssSelectorChar guibg=NONE guifg=' . g:scheme_color7
exe 'hi scssAttribute guibg=NONE guifg=' . g:scheme_color7
    hi link scssDefinition cssNoise
exe 'hi sassidChar guibg=NONE guifg=' . g:scheme_color1
exe 'hi sassClassChar guibg=NONE guifg=' . g:scheme_color5
exe 'hi sassInclude guibg=NONE guifg=' . g:scheme_color5
exe 'hi sassMixing guibg=NONE guifg=' . g:scheme_color5
exe 'hi sassMixinName guibg=NONE guifg=' . g:scheme_color4
exe 'hi javaScript guibg=NONE guifg=' . g:scheme_color7
exe 'hi javaScriptBraces guibg=NONE guifg=' . g:scheme_color7
exe 'hi javaScriptNumber guibg=NONE guifg=' . g:scheme_color5
exe 'hi markdownH1 guibg=NONE guifg=' . g:scheme_color7
    hi link markdownH2 markdownH1
    hi link markdownH3 markdownH1
    hi link markdownH4 markdownH1
    hi link markdownH5 markdownH1
    hi link markdownH6 markdownH1
exe 'hi markdownAutomaticLink guibg=NONE guifg=' . g:scheme_color2 . ' gui=underline'
    hi link markdownUrl markdownAutomaticLink
exe 'hi markdownError guibg=NONE guifg=' . g:scheme_color7
exe 'hi markdownCode guibg=NONE guifg=' . g:scheme_color3
exe 'hi markdownCodeBlock guibg=NONE guifg=' . g:scheme_color3
exe 'hi markdownCodeDelimiter guibg=NONE guifg=' . g:scheme_color5
exe 'hi markdownItalic gui=Italic'
exe 'hi markdownBold gui=Bold'
exe 'hi xdefaultsValue guibg=NONE guifg=' . g:scheme_color7
exe 'hi rubyInclude guibg=NONE guifg=' . g:scheme_color4
exe 'hi rubyDefine guibg=NONE guifg=' . g:scheme_color5
exe 'hi rubyFunction guibg=NONE guifg=' . g:scheme_color4
exe 'hi rubyStringDelimiter guibg=NONE guifg=' . g:scheme_color2
exe 'hi rubyInteger guibg=NONE guifg=' . g:scheme_color3
exe 'hi rubyAttribute guibg=NONE guifg=' . g:scheme_color4
exe 'hi rubyConstant guibg=NONE guifg=' . g:scheme_color3
exe 'hi rubyInterpolation guibg=NONE guifg=' . g:scheme_color2
exe 'hi rubyInterpolationDelimiter guibg=NONE guifg=' . g:scheme_color3
exe 'hi rubyRegexp guibg=NONE guifg=' . g:scheme_color6
exe 'hi rubySymbol guibg=NONE guifg=' . g:scheme_color2
exe 'hi rubyTodo guibg=NONE guifg=' . g:scheme_color8
exe 'hi rubyRegexpAnchor guibg=NONE guifg=' . g:scheme_color7
    hi link rubyRegexpQuantifier rubyRegexpAnchor
exe 'hi pythonOperator guibg=NONE guifg=' . g:scheme_color5
exe 'hi pythonFunction guibg=NONE guifg=' . g:scheme_color4
exe 'hi pythonRepeat guibg=NONE guifg=' . g:scheme_color5
exe 'hi pythonStatement guibg=NONE guifg=' . g:scheme_color1 . ' gui=Bold'
exe 'hi pythonBuiltIn guibg=NONE guifg=' . g:scheme_color4
exe 'hi phpMemberSelector guibg=NONE guifg=' . g:scheme_color7
exe 'hi phpComparison guibg=NONE guifg=' . g:scheme_color7
exe 'hi phpParent guibg=NONE guifg=' . g:scheme_color7
exe 'hi cOperator guibg=NONE guifg=' . g:scheme_color6
exe 'hi cPreCondit guibg=NONE guifg=' . g:scheme_color5
exe 'hi SignifySignAdd guibg=NONE guifg=' . g:scheme_color2
exe 'hi SignifySignChange guibg=NONE guifg=' . g:scheme_color4
exe 'hi SignifySignDelete guibg=NONE guifg=' . g:scheme_color1
exe 'hi NERDTreeDirSlash guibg=NONE guifg=' . g:scheme_color4
exe 'hi NERDTreeExecFile guibg=NONE guifg=' . g:scheme_color7
exe 'hi ALEErrorSign guibg=NONE guifg=' . g:scheme_color1
exe 'hi ALEWarningSign guibg=NONE guifg=' . g:scheme_color3
exe 'hi ALEError guibg=NONE guifg=' . g:scheme_color1
exe 'hi ALEWarning guibg=NONE guifg=' . g:scheme_color3

" }}}

" Plugin options {{{

let g:limelight_conceal_guifg = 8

" }}}
