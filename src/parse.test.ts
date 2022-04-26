import { PARENTHESES_PARSELET, ParserBuilder } from './parse'
import { Tokenizer, TokenMatchResult } from './tokenize'
import { expect } from 'chai'
order of operations', () => {
		const parse = new ParserBuilder<number, TokenMatchResult>(tokenize)
			.registerPrefix('NUMBER', { parse: (_, token) => +token.value })
			.infixRight('^', Precedence.Exp, (left, _, right) => left ** right)
			.infixLeft('/', Precedence.MulDiv, (left, _, right) => left / right)
			.infixLeft('*', Precedence.MulDiv, (left, _, right) => left * right)
			.infixLeft('+', Precedence.AddSub, (left, _, right) => left + right)
			.infixLeft('-', Precedence.AddSub, (left, _, right) => left - right)
			.construct()

		const result = parse('3 / 3 + 4 * 3 ^ 2 - 1')
		expect(result).equals(36)
	})

	it('can build a arithmetic parser with parentheses', () => {
		const parse = new ParserBuilder<number, TokenMatchResult>(tokenize)
			.registerPrefix('NUMBER', { parse: (_, token) => +token.value })
			.registerPrefix('(', PARENTHESES_PARSELET)
			.infixRight('^', Precedence.Exp, (left, _, right) => left ** right)
			.infixLeft('/', Precedence.MulDiv, (left, _, right) => left / right)
			.infixLeft('*', Precedence.MulDiv, (left, _, right) => left * right)
			.infixLeft('+', Precedence.AddSub, (left, _, right) => left + right)
			.infixLeft('-', Precedence.AddSub, (left, _, right) => left - right)
			.construct()

		const result = parse('3 / 3 + 4 * (3 ^ (2 - 1))')
		expect(result).equals(13)
	})

	it('can build a arithmetic parser with correct associativity', () => {
		const parse = new ParserBuilder<number, TokenMatchResult>(tokenize)
			.registerPrefix('NUMBER', { parse: (_, token) => +token.value })
			.infixRight('^', Precedence.Exp, (left, _, right) => left ** right)
			.infixLeft('-', Precedence.AddSub, (left, _, right) => left - right)
			.infixLeft('+', Precedence.AddSub, (left, _, right) => left + right)
			.construct()

		const result = parse('5 - 4 - 3 - 2 - 1 + 2 ^ 3 ^ 2')
		expect(result).equals(507)
	})

	it('can build an arithmetic parser with prefix operators', () => {
		const parse = new ParserBuilder<number, TokenMatchResult>(tokenize)
			.registerPrefix('NUMBER', { parse: (_, token) => +token.value })
			.registerPrefix('(', PARENTHESES_PARSELET)
			.prefix('-', Precedence.Negate, (_, right) => -right)
			.infixLeft('-', Precedence.AddSub, (left, _, right) => left - right)
			.infixLeft('+', Precedence.AddSub, (left, _, right) => left + right)
			.construct()

		const result = parse('-4 + -(4 + 5 - -4)')
		expect(result).equals(-17)
	})

	it('can build an arithmetic parser with postfix operators', () => {
		const parse = new ParserBuilder<number, TokenMatchResult>(tokenize)
			.registerPrefix('NUMBER', { parse: (_, token) => +token.value })
			.registerPrefix('(', PARENTHESES_PARSELET)
			.postfix('!', Precedence.Negate, left => -left)
			.infixLeft('-', Precedence.AddSub, (left, _, right) => left - right)
			.infixLeft('+', Precedence.AddSub, (left, _, right) => left + right)
			.construct()

		const result = parse('4! + (4 + 5 - 4!)!')
		expect(result).equals(-17)
	})
})
