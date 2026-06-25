function textContent(node) {
	if (!node) return '';
	if (node.type === 'text') return node.value || '';
	if (!Array.isArray(node.children)) return '';
	return node.children.map(textContent).join('');
}

function youtubeId(rawUrl) {
	let url;
	try {
		url = new URL(rawUrl.trim());
	} catch {
		return null;
	}

	const host = url.hostname.replace(/^www\./, '');
	if (host === 'youtu.be') {
		return url.pathname.split('/').filter(Boolean)[0] || null;
	}
	if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
		if (url.pathname === '/watch') return url.searchParams.get('v');
		const parts = url.pathname.split('/').filter(Boolean);
		if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') return parts[1] || null;
	}
	return null;
}

function youtubeEmbedNode(id) {
	return {
		type: 'element',
		tagName: 'div',
		properties: { className: ['youtube-embed'] },
		children: [
			{
				type: 'element',
				tagName: 'iframe',
				properties: {
					src: `https://www.youtube-nocookie.com/embed/${id}`,
					title: 'YouTube video player',
					loading: 'lazy',
					allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
					referrerPolicy: 'strict-origin-when-cross-origin',
					allowFullScreen: true,
				},
				children: [],
			},
		],
	};
}

function mediaPath(rawValue) {
	const value = rawValue.trim();
	const imagePattern = /\.(avif|gif|jpe?g|png|svg|webp)$/i;
	const videoPattern = /\.(mp4|mov|webm)$/i;

	if (!imagePattern.test(value) && !videoPattern.test(value)) return null;
	if (value.startsWith('/media/')) return { src: value, type: imagePattern.test(value) ? 'image' : 'video' };
	if (value.startsWith('public/media/')) {
		const src = value.replace(/^public\/media\//, '/media/');
		return { src, type: imagePattern.test(src) ? 'image' : 'video' };
	}

	return null;
}

function mediaEmbedNode(media) {
	if (media.type === 'video') {
		return {
			type: 'element',
			tagName: 'video',
			properties: {
				controls: true,
				src: media.src,
			},
			children: [],
		};
	}

	return {
		type: 'element',
		tagName: 'img',
		properties: {
			src: media.src,
			alt: '',
			loading: 'lazy',
		},
		children: [],
	};
}

function paragraphNode(lines) {
	return {
		type: 'element',
		tagName: 'p',
		properties: {},
		children: [{ type: 'text', value: lines.join('\n') }],
	};
}

function paragraphFromChildren(children) {
	return {
		type: 'element',
		tagName: 'p',
		properties: {},
		children,
	};
}

function youtubeLinkId(node) {
	if (node?.type !== 'element' || node.tagName !== 'a') return null;
	const href = node.properties?.href;
	return typeof href === 'string' ? youtubeId(href) : null;
}

function splitParagraphByYouTubeLinks(node) {
	if (!Array.isArray(node.children)) return null;

	const nodes = [];
	let children = [];

	for (const child of node.children) {
		const id = youtubeLinkId(child);
		if (id) {
			if (children.length > 0 && textContent({ children }).trim().length > 0) {
				nodes.push(paragraphFromChildren(children));
			}
			children = [];
			nodes.push(youtubeEmbedNode(id));
		} else {
			children.push(child);
		}
	}

	if (nodes.length === 0) return null;
	if (children.length > 0 && textContent({ children }).trim().length > 0) {
		nodes.push(paragraphFromChildren(children));
	}

	return nodes;
}

function splitParagraphByYouTubeLines(node) {
	const lines = textContent(node).split(/\r?\n/);
	const hasYouTubeLine = lines.some((line) => youtubeId(line.trim()));
	if (!hasYouTubeLine) return null;

	const nodes = [];
	let textLines = [];

	for (const line of lines) {
		const trimmed = line.trim();
		const id = youtubeId(trimmed);
		if (id) {
			if (textLines.length > 0) {
				nodes.push(paragraphNode(textLines));
				textLines = [];
			}
			nodes.push(youtubeEmbedNode(id));
		} else if (line.length > 0) {
			textLines.push(line);
		}
	}

	if (textLines.length > 0) {
		nodes.push(paragraphNode(textLines));
	}

	return nodes.length > 0 ? nodes : null;
}

function splitParagraphByEmbeddedLines(node) {
	const lines = textContent(node).split(/\r?\n/);
	const hasEmbeddedLine = lines.some((line) => youtubeId(line.trim()) || mediaPath(line));
	if (!hasEmbeddedLine) return null;

	const nodes = [];
	let textLines = [];

	for (const line of lines) {
		const trimmed = line.trim();
		const id = youtubeId(trimmed);
		const media = mediaPath(trimmed);

		if (id || media) {
			if (textLines.length > 0) {
				nodes.push(paragraphNode(textLines));
				textLines = [];
			}
			nodes.push(id ? youtubeEmbedNode(id) : mediaEmbedNode(media));
		} else if (line.length > 0) {
			textLines.push(line);
		}
	}

	if (textLines.length > 0) {
		nodes.push(paragraphNode(textLines));
	}

	return nodes.length > 0 ? nodes : null;
}

function transform(node) {
	if (!node || !Array.isArray(node.children)) return;

	node.children = node.children.flatMap((child) => {
		if (child.type === 'element' && child.tagName === 'p') {
			const nodes = splitParagraphByYouTubeLinks(child) ?? splitParagraphByEmbeddedLines(child) ?? splitParagraphByYouTubeLines(child);
			if (nodes) return nodes;
		}
		transform(child);
		return child;
	});
}

export default function rehypeYouTubeEmbeds() {
	return (tree) => {
		transform(tree);
	};
}
