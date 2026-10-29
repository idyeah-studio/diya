/** pagination: English defaults, overridable through DiyaProvider `messages`. */
export const paginationMessages = { label: 'Pagination', previous: 'Previous', next: 'Next', perPage: 'Per page', resultsPerPage: 'Results per page', page: (page: number) => `Page ${page}`, range: (start: number, end: number, total: number) => `${start}–${end} of ${total}`, noResults: '0 results' }
