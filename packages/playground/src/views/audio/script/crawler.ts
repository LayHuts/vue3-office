/**
 * 音乐爬虫脚本
 * 运行: npx tsx scripts/crawler.ts
 * 输出: src/demo/music-data.json
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Music {
  title: string;
  artist: string;
  src: string;
  pic: string;
  lrc: string;
}

const BASE_URL = 'https://www.qeecc.com';

function parseTitle(title: string) {
  const songMatch = title.match(/《(.+?)》/);
  const artistMatch = title.match(/^(.+?)《/);
  return {
    title: songMatch?.[1] || title.replace(/\[.*?\]/g, '').trim(),
    artist: artistMatch?.[1]?.trim() || '未知',
  };
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('开始爬取...\n');

  const http = axios.create({
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
    validateStatus: () => true,
  });

  // 获取 cookie
  const initRes = await http.get(BASE_URL);
  const cookies = initRes.headers['set-cookie'];
  const cookieStr = cookies?.map((c: string) => c.split(';')[0]).join('; ') || '';

  await delay(500);

  // 获取首页
  const homeRes = await http.get(BASE_URL, {
    headers: { Cookie: cookieStr, Referer: BASE_URL },
  });

  if (homeRes.status !== 200) {
    console.error('首页请求失败:', homeRes.status);
    return;
  }

  const $ = cheerio.load(homeRes.data);
  const songs: { rawTitle: string; songId: string }[] = [];

  $('.layui-row.lkbj.pm10').first().find('ul li .name a').each((i, el) => {
    if (i >= 20) return false;
    const href = $(el).attr('href') || '';
    const rawTitle = $(el).text().trim();
    const match = href.match(/\/song\/([^.]+)\.html/);
    if (match) songs.push({ rawTitle, songId: match[1] });
  });

  // 按 songId 去重
  const uniqueSongs = [...new Map(songs.map(s => [s.songId, s])).values()];
  console.log(`找到 ${uniqueSongs.length} 首歌曲\n`);

  const results: Music[] = [];

  for (const song of uniqueSongs) {
    const { title, artist } = parseTitle(song.rawTitle);
    console.log(`爬取: ${artist} - ${title}`);

    try {
      const playRes = await http.post(
        `${BASE_URL}/js/play.php`,
        `id=${song.songId}&type=music`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Cookie: cookieStr,
            Referer: `${BASE_URL}/song/${song.songId}.html`,
          },
        }
      );

      if (playRes.status === 200 && playRes.data?.url) {
        const music: Music = {
          title,
          artist,
          src: playRes.data.url,
          pic: playRes.data.pic || '',
          lrc: '',
        };

        // 获取歌词
        if (playRes.data.lkid) {
          try {
            const lrcRes = await http.get(`https://js.eev3.com/lrc.php?cid=${playRes.data.lkid}`);
            if (lrcRes.data?.lrc) music.lrc = lrcRes.data.lrc;
          } catch {}
        }

        if (!music.lrc) music.lrc = '[00:00.00]暂无歌词';

        results.push(music);
        console.log(`  ✓ 成功`);
      } else {
        console.log(`  ✗ 无音频`);
      }
    } catch (err: any) {
      console.log(`  ✗ ${err.message}`);
    }

    await delay(800);
  }

  // 按 src 去重
  const uniqueResults = [...new Map(results.map(m => [m.src, m])).values()];

  // 写入文件
  const outputPath = resolve(__dirname, '../music-data.json');
  writeFileSync(outputPath, JSON.stringify(uniqueResults, null, 2), 'utf-8');

  console.log(`\n完成! 共 ${uniqueResults.length} 首歌曲`);
  console.log(`已保存到: ${outputPath}`);
}

main().catch(console.error);
