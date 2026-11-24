// SPDX-FileCopyrightText: Copyright (c) 2026 workdd
// SPDX-License-Identifier: Apache-2.0

'use client';

import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { explorationApi } from '@/api/exploration';
import { Icon, IconName } from '@/common/icons';
import { SearchInput } from '@/common/SearchInput';
import type { SemanticFkEvidenceRowDto, SemanticFkMethod } from '@/types/exploration';

/** `'none'` groups the edges stored without evidence. */
type MethodFilter = SemanticFkMethod | 'none' | 'all';

const METHOD_LABEL: Record<SemanticFkMethod, string> = {
	declared: 'Declared foreign key',
	llm_pick: 'Picked by the LLM, not checked against values',
	value_confirmed: 'Confirmed by values',
	value_match: 'Found by values, picked by the LLM',
};

const METHOD_BADGE: Record<SemanticFkMethod, string> = {
	declared: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
	llm_pick: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
	value_confirmed: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
	value_match: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
};

const METHOD_ORDER: SemanticFkMethod[] = ['declared', 'value_confirmed', 'value_match', 'llm_pick'];

const methodOf = (row: SemanticFkEvidenceRowDto): MethodFilter => row.method ?? 'none';

const percent = (share: number | null): string =>
	share == null ? '—' : `${Math.round(share * 100)}%`;

const qualified = (schema: string | null, table: string, column: string | null): string =>
	[schema, table, column].filter(Boolean).join('.');

const matches = (row: SemanticFkEvidenceRowDto, query: string): boolean => {
	if (query === '') return true;
	const haystack = [
		row.table_name,
		row.column_name,
		row.target_table_name,
		row.target_column_name,
		row.term_name,
		row.attribute_name,
		row.rationale,
	]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
	return haystack.includes(query.toLowerCase());
};

const MethodBadge = ({ method }: { method: SemanticFkMethod | null }) =>
	method == null ? (
		<span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
			No evidence
		</span>
	) : (
		<span
			className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${METHOD_BADGE[method]}`}
		>
			{METHOD_LABEL[method]}
		</span>
	);

export const RelationshipsView = () => {
	const [query, setQuery] = useState('');
	const [method, setMethod] = useState<MethodFilter>('all');
	const [openId, setOpenId] = useState<string | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ['exploration', 'semantic-fks'],
		queryFn: () => explorationApi.getSemanticFks(),
	});
	const rows = useMemo(() => data?.data ?? [], [data]);
	const error = data?.message;

	const counts = useMemo(() => {
		const byMethod = new Map<MethodFilter, number>();
		rows.forEach((row) => byMethod.set(methodOf(row), (byMethod.get(methodOf(row)) ?? 0) + 1));
		return byMethod;
	}, [rows]);

	const visible = rows.filter(
		(row) => (method === 'all' || methodOf(row) === method) && matches(row, query),
	);

	const filters: Array<{ key: MethodFilter; label: string }> = [
		{ key: 'all', label: `All ${rows.length}` },
		...METHOD_ORDER.filter((m) => counts.has(m)).map((m) => ({
			key: m as MethodFilter,
			label: `${METHOD_LABEL[m]} ${counts.get(m)}`,
		})),
		...(counts.has('none')
			? [{ key: 'none' as MethodFilter, label: `No evidence ${counts.get('none')}` }]
			: []),
	];

	return (
		<div className="flex h-full w-full flex-col overflow-hidden bg-white dark:bg-zinc-950">
			<header className="flex items-center gap-3 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
				<Icon name={IconName.Link} className="h-5 w-5 text-body dark:text-zinc-300" />
				<div>
					<h1 className="text-lg font-semibold tracking-tight text-heading dark:text-zinc-100">
						Relationships
					</h1>
					<p className="text-xs text-body dark:text-zinc-400">
						Every semantic foreign key and the evidence compilation stored for it.
					</p>
				</div>
			</header>

			<div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
				<SearchInput
					value={query}
					onChange={setQuery}
					placeholder="Search tables, columns, terms, rationale"
					className="w-80"
					aria-label="Search relationships"
				/>
				{filters.map((filter) => (
					<button
						key={filter.key}
						type="button"
						onClick={() => setMethod(filter.key)}
						className={`rounded-full border px-3 py-1 text-xs font-medium ${
							method === filter.key
								? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
								: 'border-zinc-300 text-body hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
						}`}
					>
						{filter.label}
					</button>
				))}
			</div>

			<div className="flex-1 overflow-auto px-6 py-4">
				{isLoading ? (
					<p className="text-sm text-body dark:text-zinc-400">Loading relationships…</p>
				) : error != null ? (
					<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
				) : visible.length === 0 ? (
					<p className="text-sm text-body dark:text-zinc-400">
						{rows.length === 0
							? 'No semantic foreign keys yet. Run semantic compilation first.'
							: 'No relationship matches the filter.'}
					</p>
				) : (
					<table className="w-full border-collapse text-sm">
						<thead>
							<tr className="border-b border-zinc-200 text-left text-xs text-body dark:border-zinc-800 dark:text-zinc-400">
								<th className="py-2 pr-4 font-medium">Foreign key column</th>
								<th className="py-2 pr-4 font-medium">References</th>
								<th className="py-2 pr-4 font-medium">Term</th>
								<th className="py-2 pr-4 font-medium">Resolved by</th>
								<th className="py-2 pr-4 text-right font-medium">
									Value containment
								</th>
								<th className="py-2 pr-4 text-right font-medium">
									Vector distance
								</th>
								<th className="py-2 font-medium">LLM rationale</th>
							</tr>
						</thead>
						<tbody>
							{visible.map((row) => {
								const id = `${row.column_id}:${row.attribute_id}`;
								const open = openId === id;
								return (
									<Fragment key={id}>
										<tr
											onClick={() => setOpenId(open ? null : id)}
											className="cursor-pointer border-b border-zinc-100 align-top text-heading hover:bg-zinc-50 dark:border-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-900"
										>
											<td className="py-2 pr-4 font-mono text-xs">
												{qualified(
													row.schema_name,
													row.table_name,
													row.column_name,
												)}
											</td>
											<td className="py-2 pr-4 font-mono text-xs">
												{qualified(
													row.target_schema_name,
													row.target_table_name,
													row.target_column_name,
												)}
											</td>
											<td className="py-2 pr-4 text-xs">
												{row.attribute_name ?? '—'}
												{row.term_name != null && (
													<span className="block text-body dark:text-zinc-400">
														{row.term_name}
													</span>
												)}
											</td>
											<td className="py-2 pr-4">
												<MethodBadge method={row.method} />
											</td>
											<td className="py-2 pr-4 text-right text-xs tabular-nums">
												{percent(row.containment)}
											</td>
											<td className="py-2 pr-4 text-right text-xs tabular-nums">
												{row.vector_distance == null
													? '—'
													: row.vector_distance.toFixed(3)}
											</td>
											<td className="max-w-md py-2 text-xs text-body dark:text-zinc-300">
												<span className={open ? '' : 'line-clamp-2'}>
													{row.rationale ?? '—'}
												</span>
											</td>
										</tr>
										{open && (
											<tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-900 dark:bg-zinc-900">
												<td
													colSpan={7}
													className="px-3 py-3 text-xs text-body dark:text-zinc-300"
												>
													<p>
														<span className="font-medium text-heading dark:text-zinc-100">
															Database:
														</span>{' '}
														{row.database_name}
														{'  '}
														<span className="ml-4 font-medium text-heading dark:text-zinc-100">
															Used in join paths:
														</span>{' '}
														{row.use_in_join_paths ? 'yes' : 'no'}
													</p>
													{row.rationale != null && (
														<p className="mt-2 whitespace-pre-wrap">
															{row.rationale}
														</p>
													)}
												</td>
											</tr>
										)}
									</Fragment>
								);
							})}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
};
