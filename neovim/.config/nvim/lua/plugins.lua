local fn = vim.fn
local cmd = vim.cmd

local ensure_packer = function()
  local install_path = fn.stdpath('data')..'/site/pack/packer/start/packer.nvim'
  if fn.empty(fn.glob(install_path)) > 0 then
    fn.system({'git', 'clone', '--depth', '1',
        'https://github.com/wbthomason/packer.nvim', install_path})
    vim.cmd [[packadd packer.nvim]]
    return true
  end
  return false
end

local packer_bootstrap = ensure_packer()

return require("packer").startup({function(use)
  use "wbthomason/packer.nvim"

  use {
    "willeccles/gruvbox",
    config = function()
      vim.g.gruvbox_italic = false
      vim.g.gruvbox_invert_selection = false
      vim.cmd('colorscheme gruvbox')

      --used by better-whitespace
      vim.cmd [[highlight ExtraWhitespace guibg=#fb4934]]

      --default status line colors which have to be specified because this is
      --compared with StatusLineNC when falling back to that
      vim.cmd [[highlight StatusLine guibg=#3c3836 guifg=#ebdbb2]]
      --non-focused status line colors to fall back to when User1..2 aren't used
      vim.cmd [[highlight StatusLineNC guibg=#32302f guifg=#bdae93]]

      --use these with %1* and %2*
      vim.cmd [[highlight User1 guibg=#3c3836 guifg=#928374]]
      vim.cmd [[highlight User2 guibg=#3c3836 guifg=#ebdbb2]]
    end
  }

  --[[
  use {
    "folke/which-key.nvim",
    config = function()
      require("which-key").setup {
        plugins = {
          spelling = {
            enabled = true,
            suggestions = 20,
          },
        },
      }
    end
  }
  ]]

  use {
    "nvim-treesitter/nvim-treesitter",
    cond = function()
      return vim.fn.executable("tree-sitter")
    end,
    run = ":TSUpdate",
    config = function()
      require('nvim-treesitter.configs').setup {
        ensure_installed = "all",
        ignore_install = { "json" },
        highlight = {
          enable = true,
          custom_captures = {
            ["punctuation.bracket"] = "",
            ["punctuation.delimiter"] = "",
            ["operator"] = "",
          },
          disable = { "c", "cpp", "bash", "cmake", "help", "make" },
        },
        indent = {
          enable = false,
        },
      }
    end
  }

  use {
    "lewis6991/spellsitter.nvim",
    cond = function()
      return vim.fn.executable("tree-sitter")
    end,
    config = function()
      require('spellsitter').setup {
        enable = true,
      }
    end,
  }

  use {
    "neovim/nvim-lspconfig",
    config = function()
      require'lspconfig'.clangd.setup{}
      require'lspconfig'.pyright.setup{}
    end,
  }

  use {
    "lewis6991/gitsigns.nvim",
    cond = function()
      return vim.fn.executable('git')
    end,
    requires = { "nvim-lua/plenary.nvim" },
    config = function()
      require('gitsigns').setup {
        signs = {
          add          = { hl = 'GruvboxGreenSign', text = '+' },
          change       = { hl = 'GruvboxAquaSign', text = '~' },
          delete       = { hl = 'GruvboxRedSign', text = '_' },
          topdelete    = { hl = 'GruvboxRedSign', text = '‾' },
          changedelete = { hl = 'GruvboxAquaSign', text = '~' },
        },
        numhl = false,
        linehl = false,
      }
    end
  }

  use {
    "nvim-telescope/telescope.nvim",
    requires = {
      'nvim-lua/popup.nvim',
      'nvim-lua/plenary.nvim',
    },
    config = function()
      require'telescope'.setup{
        defaults = {
          layout_strategy = 'flex',
          dynamic_preview_title = true,
        },
        pickers = {
          buffers = {
            theme = 'ivy',
          },
          man_pages = {
            theme = 'dropdown',
          },
          spell_suggest = {
            theme = 'cursor',
          },
          oldfiles = {
            theme = 'ivy',
          },
          git_files = {
            theme = 'ivy',
          },
          find_files = {
            theme = 'ivy',
          },
          fd = {
            theme = 'ivy',
          },
          grep_string = {
            theme = 'dropdown',
          },
          current_buffer_fuzzy_find = {
            theme = 'dropdown',
          },
          help_tags = {
            theme = 'dropdown',
          },
        },
      }

      local builtin = require'telescope.builtin'
      vim.keymap.set('n', '<C-p>', function()
        builtin.find_files({
          no_ignore=true,
          no_ignore_parent=true,
          hidden=true,
        })
      end, {
        desc = '[telescope] find files in working directory',
      })
      vim.keymap.set('n', 'z=', builtin.spell_suggest, {})
      vim.keymap.set('n', '<Leader>g', builtin.grep_string, {
        desc = '[telescope] grep string under cursor in current working directory',
      })
      vim.keymap.set('n', '<Leader>/', builtin.current_buffer_fuzzy_find, {
        desc = '[telescope] current buffer fuzzy find',
      })
      vim.keymap.set('n', '<Leader>b', builtin.buffers, {
        desc = '[telescope] preview/search open buffers',
      })
      vim.keymap.set('n', '<Leader>o', function()
        builtin.oldfiles({
          -- XXX: if this is not performant, consider swapping to truncate
          path_display = {'smart'},
        })
      end, {
        desc = '[telescope] browse old files',
      })
      vim.api.nvim_create_user_command('HelpBrowse', builtin.help_tags, {
        desc = 'browse help tags with Telescope',
      })
    end,
  }

  use "adelarsq/vim-matchit"

  use "godlygeek/tabular"

  use {
    'LnL7/vim-nix',
    ft = 'nix',
  }

  use {
    "ziglang/zig.vim",
    ft = 'zig',
    config = function()
      vim.g.zig_fmt_autosave = 0
    end,
  }

  use {
    'kyazdani42/nvim-tree.lua',
    tag = 'nightly',
    config = function()
     require'nvim-tree'.setup { }

      vim.keymap.set('n', '<C-n>', '<Cmd>NvimTreeToggle<CR>', {
        silent = true,
        noremap = true,
      })
    end
  }

  use 'junegunn/vim-slash'
  use 'justinmk/vim-sneak'
  use 'machakann/vim-highlightedyank'
  use 'tomtom/tcomment_vim'
  use 'tpope/vim-fugitive'
  use 'tpope/vim-surround'
  use {
    'zhimsel/vim-stay',
    config = function()
      vim.opt.viewoptions = 'cursor,folds,slash,unix'
    end,
  }
  use 'sickill/vim-pasta'
  use 'ntpeters/vim-better-whitespace'

  use 'mbbill/undotree'

  use {
    'ggandor/leap.nvim',
    requires = {
      'tpope/vim-repeat',
    },
    config = function()
      require'leap'.add_default_mappings()
    end,
  }

  use {
    'sindrets/winshift.nvim',
    config = function()
      vim.keymap.set('n', '<C-W><C-M>', '<Cmd>WinShift<CR>')
      vim.keymap.set('n', '<C-W>m', '<Cmd>WinShift<CR>')
      vim.keymap.set('n', '<C-W>x', '<Cmd>WinShift swap<CR>')
    end,
  }

  use {
    'folke/zen-mode.nvim',
    config = function()
      require'zen-mode'.setup {
        window = {
          backdrop = 0.8,
          width = 82,
          options = {
            signcolumn = "no",
            number = false,
            relativenumber = false,
            foldcolumn = "0",
            colorcolumn = "",
          },
        },
      }
    end,
  }

  use 'folke/twilight.nvim'

  use 'uga-rosa/ccc.nvim'

  if packer_bootstrap then
    require('packer').sync()
  end
end,
config = {
  display = {
    open_fn = require('packer.util').float,
  }
}})
