import { PARENTHESES_PARSELET, ParserBuilder } from './parse'
import { Tokenizer, TokenMatchResult } from './tokenize'

const { tokenize } = new Tokenizer([
	{ pattern: '+' },
	{ pattern: '-' },
	{ pattern: '*' },
	{ pattern: '/' },
	{ pattern: '^' },
	{ pattern: '(' },
	{ pattern: ')' },
	{ pattern: /\d+/, id: 'NUMBER' },
])
	AddSub = 1,
	MulDiv = 2,
	Exp = 3,
	Negate = 4,
}

export const calculate = new ParserBuilder<number, TokenMatchResult>(tokenize)
	.registerPrefix('NUMBER', { parse: (_, token) => +token.value })
	.registerPrefix('(', PARENTHESES_PARSELET)

	.prefix('-', Precedence.Negate, (_, right) => -right)

	.infixRight('^', Precedence.Exp, (left, _, right) => left ** right)

	.infixLeft('/', Precedence.MulDiv, (left, _, right) => left / right)
	.infixLeft('*', Precedence.MulDiv, (left, _, right) => left * right)
	.infixLeft('+', Precedence.AddSub, (left, _, right) => left + right)
	.infixLeft('-', Precedence.AddSub, (left, _, right) => left - right)

	.construct()
