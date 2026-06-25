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

function transform(node) {
	if (!node || !Array.isArray(node.children)) return;

	node.children = node.children.map((child) => {
		if (child.type === 'element' && child.tagName === 'p') {
			const value = textContent(child).trim();
			const id = youtubeId(value);
			if (id) return youtubeEmbedNode(id);
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
