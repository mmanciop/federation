# CHANGELOG for `@apollo/composition`

This CHANGELOG pertains only to Apollo Federation packages in the 2.x range. The Federation v0.x equivalent for this package can be found [here](https://github.com/apollographql/federation/blob/version-0.x/federation-js/CHANGELOG.md) on the `version-0.x` branch of this repo.

## 2.1.0-alpha.1

- Warn on merging inconsistent non-repeatable directive applications instead of failing composition [PR #1840](https://github.com/apollographql/federation/pull/1840).

## 2.1.0-alpha.0

- Expand support for Node.js v18 [PR #1884](https://github.com/apollographql/federation/pull/1884)

## v2.0.1

- Use `for: SECURITY` in the core/link directive application in the supergraph for `@inaccessible` [PR #1715](https://github.com/apollographql/federation/pull/1715)

## v2.0.0

- Previous preview release promoted to general availability! Please see previous changelog entries for full info.

## v2.0.0-preview.11

- Add a level to hints, uppercase their code and related fixes [PR #1683](https://github.com/apollographql/federation/pull/1683).
- Add support for `@inaccessible` v0.2 [PR #1678](https://github.com/apollographql/federation/pull/1678)

## v2.0.0-preview.10

- Fix merging of Input objects and enum types [PR #1672](https://github.com/apollographql/federation/pull/1672).
- Fix regression in composition validation introduced by #1653 [PR #1673](https://github.com/apollographql/federation/pull/1673).
- Add nodes when displaying hints for `@override` [PR #1684](https://github.com/apollographql/federation/pull/1684)

## v2.0.0-preview.9

- Fix handling of core/link when definitions are provided or partially so [PR #1662](https://github.com/apollographql/federation/pull/1662).
- Optimize composition validation when many entities spans many subgraphs [PR #1653](https://github.com/apollographql/federation/pull/1653).
- Support for Node 17 [PR #1541](https://github.com/apollographql/federation/pull/1541).
- Adds Support for `@tag/v0.2`, which allows the `@tag` directive to be additionally placed on arguments, scalars, enums, enum values, input objects, and input object fields. [PR #1652](https://github.com/apollographql/federation/pull/1652).
- Adds support for the `@override` directive on fields to indicate that a field should be moved from one subgraph to another. [PR #1484](https://github.com/apollographql/federation/pull/1484)

## v2.0.0-preview.8

NOTE: Be sure to upgrade the gateway _before_ re-composing/deploying with this version. See below and the changelog for `@apollo/gateway`.

- Adds support for `@inaccessible` in subgraphs [PR #1638](https://github.com/apollographql/federation/pull/1638).
- Fix merging of `@tag` directive when it is renamed in subgraphs [PR #1637](https://github.com/apollographql/federation/pull/1637).
- Generates supergraphs with `@link` instead of `@core`. As a result, prior federation 2 pre-release gateway will not read supergraphs generated by this version correctly, so you should upgrade the gateway to this version _before_ re-composing/deploying with this version.  [PR #1628](https://github.com/apollographql/federation/pull/1628).

## v2.0.0-preview.5

- Fix propagation of `@tag` to the supergraph and allows @tag to be repeated. Additionally, merged directives (only `@tag` and `@deprecated` currently) are not allowed on external fields anymore [PR #1592](https://github.com/apollographql/federation/pull/1592).

## v2.0.0-preview.4

- Released in sync with other federation packages but no changes to this package.

## v2.0.0-preview.3

- Released in sync with other federation packages but no changes to this package.

## v2.0.0-preview.2

- Re-publishing release which published to npm with stale build artifacts from `version-0.x` release.

## v2.0.0-preview.1

- No-op publish to account for publishing difficulties.

## v2.0.0-preview.0

- Initial "preview" release.

## v2.0.0-alpha.6

- No direct changes, only transitive updates to `@apollo/query-graphs` and `@apollo/federation-internals`.

## v2.0.0-alpha.5

- Remove `graphql@15` from peer dependencies [PR #1472](https://github.com/apollographql/federation/pull/1472).

## v2.0.0-alpha.3

- Assign and document error codes for all errors [PR #1274](https://github.com/apollographql/federation/pull/1274).

## v2.0.0-alpha.2

- __BREAKING__: Bump graphql peer dependency to `^15.7.0` [PR #1200](https://github.com/apollographql/federation/pull/1200)
- Add missing dependency to `@apollo/query-graphs`

## v2.0.0-alpha.1

- :tada: Initial alpha release of Federation 2.0.  For more information, see our [documentation](https://www.apollographql.com/docs/federation/v2/).  We look forward to your feedback!
