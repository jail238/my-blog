import assert from 'node:assert/strict';
import test from 'node:test';
import { findProfileFunctionBinding } from './maishift-build-parser.mjs';

test('finds the profile function in the original direct loader shape', () => {
	const source = `x=Pe("/{-$locale}/profile/$handle")({loader:async({params:e})=>await oldFn({data:{handle:e.handle}}),component:y})`;
	assert.equal(findProfileFunctionBinding(source), 'oldFn');
});

test('finds the profile function in the current Promise.all loader shape', () => {
	const source = `x=Pe("/{-$locale}/profile/$handle")({beforeLoad:()=>other(),loader:async({params:e})=>{const n={handle:e.handle};const [i,o]=await Promise.all([currentFn({data:n}),diffFn({data:n})]);return {...i,diff:o}},staleTime:1/0})`;
	assert.equal(findProfileFunctionBinding(source), 'currentFn');
});

test('fails loudly when the profile route no longer exposes a data function', () => {
	const source = `x=Pe("/{-$locale}/profile/$handle")({loader:async()=>null})`;
	assert.throws(() => findProfileFunctionBinding(source), /profile function binding/);
});
