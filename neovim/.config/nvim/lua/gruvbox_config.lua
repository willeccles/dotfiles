-- This is a helper function which allows me to support both dark and light
-- themes with gruvbox.nvim. Dark is gruvbox medium dark and light is hard
-- contrast.

local M = {}

-- mode is either "dark" or "light"
function M.configure(mode)
  vim.o.background = mode

  local palette = require('gruvbox.palette')
  local colors = palette.get_base_colors(vim.o.background, "")
  local soft_colors = palette.get_base_colors(vim.o.background, "soft")
  config = {
    contrast = "",
    undercurl = true,
    underline = true,
    bold = false,
    italic = {
      strings = false,
      comments = false,
      operators = false,
      folds = false,
    },
    -- NOTE: this is probably best, but the issue is twofold:
    -- 1. nvim-notify complains on the first notification (easy enough to
    --    fix)
    -- 2. Lazy has some issues
    -- So for now, transparent mode is off.
    transparent_mode = false,
    overrides = {
      -- TODO: find a replacement for better-whitespace that's less buggy
      -- when I do, replace this color code with one of the colors.XXX
      -- options
      -- ExtraWhitespace = { bg = '#fb4934' },

      -- fix TODOs after #247
      Todo = { fg = colors.fg0, bg = 'NONE' },

      -- ugly :/
      SignColumn = { bg = 'NONE' },
      GruvboxRedSign = { bg = 'NONE' },
      GruvboxGreenSign = { bg = 'NONE' },
      GruvboxYellowSign = { bg = 'NONE' },
      GruvboxBlueSign = { bg = 'NONE' },
      GruvboxPurpleSign = { bg = 'NONE' },
      GruvboxAquaSign = { bg = 'NONE' },
      GruvboxOrangeSign = { bg = 'NONE' },

      StatusLine = { bg = colors.bg1, fg = colors.fg1 },
      StatusLineNC = { bg = soft_colors.bg0, fg = colors.fg3 },
      -- use these with %1* and %2*
      User1 = { bg = colors.bg1, fg = colors.gray },
      User2 = { bg = colors.bg1, fg = colors.fg1 },

      -- fix highlighting with LSP
      ["@variable"] = { link = "Identifier" },
      ["@namespace"] = { link = "Identifier" },
      -- still not sure if I'm happy with this one :/
      ["@constructor"] = { link = "Structure" },

      manItalic = { link = "GruvboxGreen" },
      manBold = { link = "GruvboxRedBold" },
    },
  }

  if mode == "light" then
    config.contrast = "hard"
  end

  require'gruvbox'.setup(config)

  vim.cmd[[colorscheme gruvbox]]
end

return M
