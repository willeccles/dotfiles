local fn = vim.fn

function map(mode, lhs, rhs, opts)
  local options = {noremap = false}
  if opts then options = vim.tbl_extend('force', options, opts) end
  vim.api.nvim_set_keymap(mode, lhs, rhs, options)
end

function noremap(mode, lhs, rhs, opts)
  local options = {noremap = true}
  if opts then options = vim.tbl_extend('force', options, opts) end
  vim.api.nvim_set_keymap(mode, lhs, rhs, options)
end

vim.g.mapleader = ' '

-- press escape to exit insert mode in terminal to be able to switch windows
noremap('t', '<Esc>', '<C-\\><C-n>')
map('t', '<C-w>', '<Esc><C-w>')

-- switch windows with tab or leader
noremap('n', '<Tab>', '<C-w>')
noremap('n', '<Leader><Up>', '<C-w><Up>')
noremap('n', '<Leader><Down>', '<C-w><Down>')
noremap('n', '<Leader><Left>', '<C-w><Left>')
noremap('n', '<Leader><Right>', '<C-w><Right>')
noremap('n', '<Leader>k', '<C-w><Up>')
noremap('n', '<Leader>j', '<C-w><Down>')
noremap('n', '<Leader>h', '<C-w><Left>')
noremap('n', '<Leader>l', '<C-w><Right>')

-- Z to toggle folds
noremap('n', 'Z', 'za')
noremap('n', '<Leader>z', 'za')

-- sort paragraphs with C-s, reverse sort with alt-s
noremap('n', '<C-s>', 'vip:sort<CR>', {silent = true})
noremap('n', '<M-s>', 'vip:sort!<CR>', {silent = true})

-- yank to clipboard in visual with c-y
noremap('v', '<C-y>', '"+y<CR>')

-- indent file
noremap('n', 'g=', ':retab<CR>mvgg=G`v', {silent = true})

noremap('n', '<C-Up>', ':move--<CR>', {silent = true})
noremap('n', '<C-Down>', ':move+<CR>', {silent = true})
map('n', '<C-k>', '<C-Up>', {silent = true})
map('n', '<C-j>', '<C-Down>', {silent = true})
