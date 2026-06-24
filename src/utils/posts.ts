function publishSequence(id) {
	const match = id.match(/-(\d+)$/);
	return match ? Number(match[1]) : 0;
}

export function comparePostsOldestFirst(a, b) {
	const dateDiff = a.data.pubDate.valueOf() - b.data.pubDate.valueOf();
	if (dateDiff !== 0) {
		return dateDiff;
	}

	const sequenceDiff = publishSequence(a.id) - publishSequence(b.id);
	if (sequenceDiff !== 0) {
		return sequenceDiff;
	}

	return a.id.localeCompare(b.id, undefined, { numeric: true });
}

export function comparePostsNewestFirst(a, b) {
	const dateDiff = b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
	if (dateDiff !== 0) {
		return dateDiff;
	}

	const sequenceDiff = publishSequence(b.id) - publishSequence(a.id);
	if (sequenceDiff !== 0) {
		return sequenceDiff;
	}

	return b.id.localeCompare(a.id, undefined, { numeric: true });
}

export function postCategoryNumber(post, posts) {
	const categoryPosts = posts
		.filter((item) => !item.data.draft && item.data.category === post.data.category)
		.sort(comparePostsOldestFirst);

	return categoryPosts.findIndex((item) => item.id === post.id) + 1;
}

export function postCategoryLabel(post, posts, categories) {
	const categoryName = categories[post.data.category];
	const number = postCategoryNumber(post, posts);
	return number > 0 ? `${categoryName} #${number}` : categoryName;
}
