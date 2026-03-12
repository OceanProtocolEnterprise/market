import fs from 'fs'
import { join } from 'path'
import matter from 'gray-matter'
import { execFileSync } from 'child_process'

//
// Next.js specifics to be used in getStaticProps / getStaticPaths
// to automatically generate pages from Markdown files in `src/pages/[slug].tsx`.
//
// const pagesDirectory = join(process.cwd(), 'content', 'pages')
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

export function getPageBySlug(slug: string, subDir?: string): PageData {
  const realSlug = slug.replace(/\.md$/, '')
  const fullPath = subDir
    ? join(pagesDirectory, subDir, `${realSlug}.md`)
    : join(pagesDirectory, `${realSlug}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const fileStats = fs.statSync(fullPath)
  const gitLastUpdated = getGitLastUpdated(fullPath)
  const { data, content } = matter(fileContents)

  return {
    slug: realSlug,
    frontmatter: { ...data },
    content,
    fileLastUpdated: gitLastUpdated || fileStats.mtime.toISOString()
  }
}

export function getAllPages(subDir?: string): PageData[] {
  const slugs = fs
    .readdirSync(join(pagesDirectory, subDir || ''))
    .filter((slug) => slug.includes('.md'))
  const pages = slugs.map((slug) => getPageBySlug(slug, subDir))

  return pages
}
