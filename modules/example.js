const mockContent = {
  'demon-slayer': {
    title: 'Demon Slayer',
    image: 'https://via.placeholder.com/300x450?text=Demon+Slayer',
    description: 'A young boy whose sister has been turned into a demon seeks to find a cure and defeat the demon lord Muzan Kibutsuji.',
    airdate: '2019',
    episodes: 26,
    episodes_list: Array.from({length: 26}, (_, i) => ({
      number: i + 1,
      href: `demon-slayer-ep${i + 1}`,
      title: `Episode ${i + 1}`
    }))
  },
  'jujutsu-kaisen': {
    title: 'Jujutsu Kaisen',
    image: 'https://via.placeholder.com/300x450?text=Jujutsu+Kaisen',
    description: 'A high schooler discovers he has the power of a cursed demon sealed within him and becomes part of a secret organization dedicated to fighting demons.',
    airdate: '2020',
    episodes: 24,
    episodes_list: Array.from({length: 24}, (_, i) => ({
      number: i + 1,
      href: `jujutsu-kaisen-ep${i + 1}`,
      title: `Episode ${i + 1}`
    }))
  },
  'attack-on-titan': {
    title: 'Attack on Titan',
    image: 'https://via.placeholder.com/300x450?text=Attack+on+Titan',
    description: 'In a world where enormous humanoid creatures suddenly begin devouring humans, a group of soldiers must fight to protect the remaining survivors.',
    airdate: '2013',
    episodes: 75,
    episodes_list: Array.from({length: 25}, (_, i) => ({
      number: i + 1,
      href: `aot-ep${i + 1}`,
      title: `Episode ${i + 1}`
    }))
  }
};

export async function searchResults(keyword) {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const query = keyword.toLowerCase();
  const results = Object.entries(mockContent)
    .filter(([key, content]) => 
      content.title.toLowerCase().includes(query) || 
      key.includes(query)
    )
    .map(([key, content]) => ({
      title: content.title,
      image: content.image,
      href: key
    }));

  return JSON.stringify(results);
}

export async function extractDetails(url) {
  await new Promise(resolve => setTimeout(resolve, 150));
  
  const content = mockContent[url];
  
  if (!content) {
    return JSON.stringify({
      description: 'Content not found',
      aliases: 'Unknown',
      airdate: 'Unknown'
    });
  }

  return JSON.stringify({
    description: content.description,
    aliases: `${content.episodes} episodes`,
    airdate: content.airdate
  });
}

export async function extractEpisodes(url) {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const content = mockContent[url];
  
  if (!content || !content.episodes_list) {
    return JSON.stringify([]);
  }

  return JSON.stringify(
    content.episodes_list.map(ep => ({
      href: ep.href,
      number: ep.number
    }))
  );
}

export async function extractStreamUrl(url) {
  await new Promise(resolve => setTimeout(resolve, 150));
  
  const streams = [
    {
      title: 'Server 1 (HLS)',
      streamUrl: `https://example-stream.com/videos/${url}.m3u8`,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    },
    {
      title: 'Server 2 (MP4)',
      streamUrl: `https://backup-stream.com/videos/${url}.mp4`,
      headers: {}
    }
  ];

  return JSON.stringify({
    streams: streams,
    subtitle: `https://example-subs.com/${url}.vtt`
  });
}

export default {
  searchResults,
  extractDetails,
  extractEpisodes,
  extractStreamUrl
};
