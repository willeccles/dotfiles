local fn = vim.fn

function mode_map(mode, lhs, rhs, opts)
  local options = {noremap = false}
  if opts then options = vim.tbl_extend('force', options, opts) end
  vim.keymap.set(mode, lhs, rhs, options)
end

function mode_noremap(mode, lhs, rhs, opts)
  local options = {noremap = true}
  if opts then options = vim.tbl_extend('force', options, opts) end
  vim.keymap.set(mode, lhs, rhs, options)
end

function map(lhs, rhs, opts) mode_map('', lhs, rhs, opts) end
function tmap(lhs, rhs, opts) mode_map('t', lhs, rhs, opts) end
function nmap(lhs, rhs, opts) mode_map('n', lhs, rhs, opts) end
function vmap(lhs, rhs, opts) mode_map('v', lhs, rhs, opts) end
function noremap(lhs, rhs, opts) mode_noremap('', lhs, rhs, opts) end
function tnoremap(lhs, rhs, opts) mode_noremap('t', lhs, rhs, opts) end
function nnoremap(lhs, rhs, opts) mode_noremap('n', lhs, rhs, opts) end
function vnoremap(lhs, rhs, opts) mode_noremap('v', lhs, rhs, opts) end

vim.g.mapleader = ' '

-- press escape to exit insert mode in terminal to be able to switch windows
tnoremap('<Esc>', '<C-\\><C-n>')
tmap('<C-w>', '<Esc><C-w>')

-- switch windows with tab or leader
nnoremap('<Tab>', '<C-w>')
nnoremap('<Leader><Up>', '<C-w><Up>')
nnoremap('<Leader><Down>', '<C-w><Down>')
nnoremap('<Leader><Left>', '<C-w><Left>')
nnoremap('<Leader><Right>', '<C-w><Right>')
nnoremap('<Leader>k', '<C-w><Up>')
nnoremap('<Leader>j', '<C-w><Down>')
nnoremap('<Leader>h', '<C-w><Left>')
nnoremap('<Leader>l', '<C-w><Right>')

-- Z to toggle folds
nnoremap('Z', 'za')
nnoremap('<Leader>z', 'za')

-- sort paragraphs with C-s, reverse sort with alt-s
nnoremap('<C-s>', 'vip:sort<CR>', {silent = true})
nnoremap('<M-s>', 'vip:sort!<CR>', {silent = true})

-- yank to clipboard in visual with c-y
vnoremap('<C-y>', '"+y<CR>')

-- indent file
nnoremap('g=', ':retab<CR>mvgg=G`v', {silent = true})

nnoremap('<C-Up>', ':move--<CR>', {silent = true})
nnoremap('<C-Down>', ':move+<CR>', {silent = true})
nmap('<C-k>', '<C-Up>', {silent = true})
nmap('<C-j>', '<C-Down>', {silent = true})

noremap('<F7>', '<Esc>:tabp<CR>', {silent = true})
noremap('<F8>', '<Esc>:tabn<CR>', {silent = true})
noremap('<F9>', '<Esc>:tabe<Space>')
noremap('<C-F7>', '<Esc>:bp<CR>', {silent = true})
noremap('<C-F8>', '<Esc>:bn<CR>', {silent = true})

vnoremap('<', '<gv')
vnoremap('>', '>gv')

-- use <Leader>o like o, but continues comments if &fo doesn't include o
nnoremap('<Leader>o', 'A<CR>')
