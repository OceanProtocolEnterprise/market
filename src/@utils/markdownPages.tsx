import fs from 'fs'
import { join } from 'path'
import { parseFrontmatter } from './parseFrontmatter'
import { execFileSync } from 'child_process'
import {
  dpuaUrl,
  imprintUrl,
  cookiePolicyUrl,
  privacyPolicyUrl,
  termsUrl
} from 'app.config.cjs'

const pagesDirectory = './content/pages'
export interface PageData {
  slug: string
  frontmatter: { [key: string]: any }
  content: string
  fileLastUpdated: string
}

let hasGitBinary: boolean | undefined

function canUseGit(): boolean {
  if (hasGitBinary !== undefined) return hasGitBinary
  try {
    execFileSync('git', ['--version'], { stdio: 'ignore' })
    hasGitBinary = true
  } catch {
    hasGitBinary = false
  }
  return hasGitBinary
}

function getGitLastUpdated(fullPath: string): string | null {
  if (!canUseGit()) return null
  try {
    const lastUpdated = execFileSync(
      'git',
      ['log', '-1', '--format=%cI', '--', fullPath],
      { encoding: 'utf8' }
    ).trim()
    return lastUpdated || null
  } catch {
    return null
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function addTitleToContent(content: string, title: string): string {
  const trimmedContent = content.trim()
  const titleRegex = new RegExp(`^#{1,6}\\s+${escapeRegex(title)}$`, 'im')
  const hasTitleHeading = titleRegex.test(trimmedContent)
  const firstLine = trimmedContent.split('\n')[0]
  const firstLineIsHeading = /^#{1,6}\s+/.test(firstLine)

  if (!hasTitleHeading && !firstLineIsHeading && title) {
    return `# ${title}\n\n${content}`
  }
  return content
}

function getExternalUrl(slug: string): string | null {
  const cleanSlug = slug.replace(/^privacy\//, '').replace(/\.md$/, '')

  const urlMap: Record<string, string> = {
    imprint: imprintUrl || '',
    terms: termsUrl || '',
    'privacy-policy': privacyPolicyUrl || '',
    'cookie-policy': cookiePolicyUrl || '',
    'data-portal-usage-agreement': dpuaUrl || ''
  }

  const url = urlMap[cleanSlug]
  return url && url.trim() !== '' ? url : null
}

async function fetchExternalContent(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html,text/plain,text/markdown,application/json,*/*'
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.text()
  } catch (error) {
    console.error(`Error fetching external content from ${url}:`, error)
    return null
  }
}

function extractGitHubContent(html: string): string | null {
  const markdownMatch = html.match(
    /<article[^>]*class="markdown-body[^>]*>([\s\S]*?)<\/article>/i
  )
  if (markdownMatch && markdownMatch[1]) {
    let content = markdownMatch[1]
    content = content.replace(/<tr>[\s\S]*?<\/table>/gi, '')
    content = content.replace(/<[^>]*>/g, '')
    return content.trim()
  }
  return null
}

function findMarkdownFile(slug: string, subDir?: string): string | null {
  const cleanSlug = slug.replace(/^privacy\//, '').replace(/\.md$/, '')
  const possiblePaths = []

  if (subDir) {
    possiblePaths.push(
      join(pagesDirectory, subDir, cleanSlug, 'en.md'),
      join(pagesDirectory, subDir, cleanSlug, 'index.md'),
      join(pagesDirectory, subDir, `${cleanSlug}.md`)
    )
  } else {
    possiblePaths.push(
      join(pagesDirectory, cleanSlug, 'en.md'),
      join(pagesDirectory, cleanSlug, 'index.md'),
      join(pagesDirectory, `${cleanSlug}.md`)
    )
  }

  for (const path of possiblePaths) {
    if (fs.existsSync(path)) {
      return path
    }
  }
  return null
}

export async function getPageBySlug(
  slug: string,
  subDir?: string
): Promise<PageData> {
  const realSlug = slug.replace(/^privacy\//, '').replace(/\.md$/, '')

  const externalUrl = getExternalUrl(realSlug)

  if (externalUrl) {
    let externalContent = await fetchExternalContent(externalUrl)

    if (externalContent) {
      if (
        externalUrl.includes('github.com') &&
        externalUrl.includes('/blob/')
      ) {
        const extracted = extractGitHubContent(externalContent)
        if (extracted) externalContent = extracted
      }

      const { data, content } = parseFrontmatter(externalContent)
      const title =
        data.title ||
        realSlug
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')

      const contentWithTitle = addTitleToContent(content, title)

      return {
        slug: realSlug,
        frontmatter: data || { title },
        content: contentWithTitle,
        fileLastUpdated: new Date().toISOString().split('T')[0]
      }
    }
  }

  const filePath = findMarkdownFile(slug, subDir)

  if (!filePath) {
    return {
      slug: realSlug,
      frontmatter: {
        title: realSlug
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        description: ''
      },
      content: `# Content Not Found\n\nThe requested content could not be found.`,
      fileLastUpdated: new Date().toISOString().split('T')[0]
    }
  }

  const fileContents = fs.readFileSync(filePath, 'utf8')
  const fileStats = fs.statSync(filePath)
  const gitLastUpdated = getGitLastUpdated(filePath)
  const { data, content } = parseFrontmatter(fileContents)

  const title =
    data.title ||
    realSlug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

  const contentWithTitle = addTitleToContent(content, title)

  return {
    slug: realSlug,
    frontmatter: { ...data, title },
    content: contentWithTitle,
    fileLastUpdated:
      gitLastUpdated || fileStats.mtime.toISOString().split('T')[0]
  }
}

export function getAllPages(subDir?: string): PageData[] {
  const targetDir = join(pagesDirectory, subDir || '')
  if (!fs.existsSync(targetDir)) return []

  const items = fs.readdirSync(targetDir)
  const pages: PageData[] = []

  for (const item of items) {
    const itemPath = join(targetDir, item)
    const stat = fs.statSync(itemPath)

    if (stat.isDirectory()) {
      const enMdPath = join(itemPath, 'en.md')
      const indexMdPath = join(itemPath, 'index.md')

      if (fs.existsSync(enMdPath)) {
        const fileContents = fs.readFileSync(enMdPath, 'utf8')
        const fileStats = fs.statSync(enMdPath)
        const gitLastUpdated = getGitLastUpdated(enMdPath)
        const { data, content } = parseFrontmatter(fileContents)
        const title =
          data.title ||
          item
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')

        pages.push({
          slug: item,
          frontmatter: { ...data, title },
          content,
          fileLastUpdated:
            gitLastUpdated || fileStats.mtime.toISOString().split('T')[0]
        })
      }
    }
  }
  return pages
}
