import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type DefaultTheme } from 'vitepress'

const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

type SpecSection = {
  directory: string
  title: string
  collapsed?: boolean
}

const specSections: SpecSection[] = [
  { directory: '01-product', title: '产品' },
  { directory: '02-architecture', title: '架构' },
  { directory: '03-runtime', title: '运行时', collapsed: true },
  { directory: '04-ux', title: '用户体验', collapsed: true },
  { directory: '05-security', title: '安全', collapsed: true },
  { directory: '06-delivery', title: '交付', collapsed: true },
  { directory: '07-plugins', title: '插件', collapsed: true },
  { directory: '08-meta', title: '决策与元数据', collapsed: true },
]

const preferredRootFiles = ['README.md', '00-baseline.md', 'NAV.md']

function titleFromMarkdown(filePath: string): string {
  const source = fs.readFileSync(filePath, 'utf8')
  const frontmatterTitle = source.match(/^---[\s\S]*?^title:\s*(.+?)\s*$[\s\S]*?^---/m)?.[1]
  if (frontmatterTitle) return frontmatterTitle.replace(/^['"]|['"]$/g, '')
  return source.match(/^#\s+(.+)$/m)?.[1]?.replace(/`/g, '') ?? path.basename(filePath, '.md')
}

function specItems(directory: string): DefaultTheme.SidebarItem[] {
  const sourceDirectory = path.join(docsRoot, 'spec', directory)
  if (!fs.existsSync(sourceDirectory)) return []
  return fs.readdirSync(sourceDirectory)
    .filter((file) => file.endsWith('.md'))
    .sort((left, right) => {
      if (left === 'README.md') return -1
      if (right === 'README.md') return 1
      return left.localeCompare(right, 'en')
    })
    .map((file) => ({
      text: titleFromMarkdown(path.join(sourceDirectory, file)),
      link: `/spec/${directory}/${file.slice(0, -3)}`,
    }))
}

function adrItems(): DefaultTheme.SidebarItem[] {
  const directory = path.join(docsRoot, 'adr')
  return fs.readdirSync(directory)
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .sort((left, right) => left.localeCompare(right, 'en'))
    .map((file) => ({
      text: titleFromMarkdown(path.join(directory, file)),
      link: `/adr/${file.slice(0, -3)}`,
    }))
}

function projectItems(): DefaultTheme.SidebarItem[] {
  const directory = path.join(docsRoot, 'project')
  return fs.readdirSync(directory)
    .filter((file) => file.endsWith('.md'))
    .sort((left, right) => {
      if (left === 'README.md') return -1
      if (right === 'README.md') return 1
      return left.localeCompare(right, 'en')
    })
    .map((file) => ({
      text: titleFromMarkdown(path.join(directory, file)),
      link: `/project/${file.slice(0, -3)}`,
    }))
}

function specSidebar(): DefaultTheme.SidebarItem[] {
  const localizedRoot = path.join(docsRoot, 'spec')
  const rootFiles = fs.readdirSync(localizedRoot)
    .filter((file) => file.endsWith('.md'))
  const startItems = preferredRootFiles
    .filter((file) => fs.existsSync(path.join(localizedRoot, file)))
    .map((file) => ({
      text: titleFromMarkdown(path.join(localizedRoot, file)),
      link: `/spec/${file.slice(0, -3)}`,
    }))
  const referenceItems = rootFiles
    .filter((file) => !preferredRootFiles.includes(file))
    .sort((left, right) => left.localeCompare(right, 'en'))
    .map((file) => ({
      text: titleFromMarkdown(path.join(localizedRoot, file)),
      link: `/spec/${file.slice(0, -3)}`,
    }))

  return [
    { text: '从这里开始', items: startItems },
    ...specSections.map((section) => ({
      text: section.title,
      collapsed: section.collapsed,
      items: specItems(section.directory),
    })),
    ...(referenceItems.length ? [{
      text: '兼容性参考',
      collapsed: true,
      items: referenceItems,
    }] : []),
  ]
}

const sidebar: DefaultTheme.Sidebar = {
  '/guide/': [{ text: '指南', items: [{ text: '快速开始', link: '/guide/' }, { text: '界面截图', link: '/guide/screenshots' }] }],
  '/plugin-development': [{ text: '插件开发', items: [{ text: '从零到一', link: '/plugin-development' }, ...specItems('07-plugins')] }],
  '/project/': [{ text: '项目记录', items: projectItems() }],
  '/spec/': specSidebar(),
  '/adr/': [
    {
      text: '架构决策记录',
      items: [
        { text: 'ADR 索引', link: '/adr/README' },
        { text: '文档站决策', link: '/adr/0079-vitepress-documentation-site' },
        { text: '最新决策', link: '/spec/08-meta/decisions-log' },
      ],
    },
    { text: '全部决策', collapsed: true, items: adrItems() },
  ],
}

const nav: DefaultTheme.NavItem[] = [
  { text: '快速开始', link: '/guide/' },
  { text: '规格', link: '/spec/README' },
  { text: 'ADR', link: '/adr/README' },
  { text: '插件开发', link: '/plugin-development' },
  { text: '隐私政策（英文）', link: '/privacy-policy' },
  { text: 'GitHub', link: 'https://github.com/vastsa/PI-Desktop' },
]

export default defineConfig({
  title: 'PI-Desktop 文档',
  description: '本地优先的 AI 编程代理文档',
  lang: 'zh-CN',
  appearance: true,
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'theme-color', content: '#f8fafc' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap' }],
  ],
  markdown: {
    html: false,
    lineNumbers: true,
    theme: { light: 'github-light', dark: 'github-dark' },
  },
  themeConfig: {
    logo: '/app-icon.png',
    siteTitle: 'PI-Desktop',
    search: { provider: 'local', options: { translations: { button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' }, modal: { noResultsText: '没有找到相关结果', resetButtonTitle: '清除查询', footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' } } } } },
    socialLinks: [{ icon: 'github', link: 'https://github.com/vastsa/PI-Desktop' }],
    editLink: { pattern: 'https://github.com/vastsa/PI-Desktop/edit/main/docs/:path', text: '在 GitHub 上编辑此页' },
    outline: { level: 'deep', label: '本页目录' },
    docFooter: { prev: '上一页', next: '下一页' },
    lastUpdated: { text: '最后更新于' },
    returnToTopLabel: '返回顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '外观',
    footer: { message: '为本地优先开发而构建。 <a href="https://aiuo.net" target="_blank" rel="noreferrer">AIUO.NET</a>', copyright: 'Copyright © 2026 PI-Desktop 贡献者' },
    nav,
    sidebar,
  },
})
