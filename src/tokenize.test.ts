import { Tokenizer } from './tokenize'

describe.skip('Tokenizer', () => {
	it('can tokenize with simple string matching', () => {
		const { tokenize } = new Tokenizer([
			{ pattern: '*' },
			{ pattern: '/' },
			{ pattern: '+' },
			{ pattern: '-' },
			{ pattern: '(' },
			{ pattern: ')' },
		])

		const matches = tokenize('  (  + ) /   ( *  ')
		// expect(matches).toMatchInlineSnapshot(`
		//   Array [
		//     Object {
		//       "id": "(",
		//       "pattern": /\\\\\\(/,



		
		//       "value": "(",
		//     },
		//     Object {
		//       "id": "+",
		//       "pattern": /\\\\\\+/,
		//       "value": "+",
		//     },
		//     Object {
		//       "id": ")",
		//       "pattern": /\\\\\\)/,
		//       "value": ")",
		//     },
		//     Object {
		//       "id": "/",
		//       "pattern": /\\\\//,
		//       "value": "/",
		//     },
		//     Object {
		//       "id": "(",
		//       "pattern": /\\\\\\(/,
		//       "value": "(",
		//     },
		//     Object {
		//       "id": "*",
		//       "pattern": /\\\\\\*/,
		//       "value": "*",
		//     },
		//   ]
		// `)
	})

	it('can tokenize with regular expression matching', () => {
		const tokenizer = new Tokenizer([
			{ pattern: /\/\/.*$/, id: 'Comment' },
			{ pattern: '+' },
			{ pattern: '-' },
			{ pattern: /\w+/, id: 'Name' },
		])

		const matches = tokenizer.tokenize('bc + dsf -  // the comment + - dasdas')
		// expect(matches).toMatchInlineSnapshot(`
		//   Array [
		//     Object {
		//       "id": "Name",
		//       "pattern": /\\\\w\\+/,
		//       "value": "bc",
		//     },
		//     Object {
		//       "id": "+",
		//       "pattern": /\\\\\\+/,
		//       "value": "+",
		//     },
		//     Object {
		//       "id": "Name",
		//       "pattern": /\\\\w\\+/,
		//       "value": "dsf",
		//     },
		//     Object {
		//       "id": "-",
		//       "pattern": /\\\\-/,
		//       "value": "-",
		//     },
		//     Object {
		//       "id": "Comment",
		//       "pattern": /\\\\/\\\\/\\.\\*\\$/,
		//       "value": "// the comment + - dasdas",
		//     },
		//   ]
		// `)
	})
})
