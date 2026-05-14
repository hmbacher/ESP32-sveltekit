<script lang="ts" module>
	export type UriProtocol = { scheme: string; defaultPort: number };
</script>

<script lang="ts">
	interface Props {
		value?: string;
		protocols: UriProtocol[];
		defaultProtocol?: string;
		fixedPort?: number;
		portMin?: number;
		portMax?: number;
		id?: string;
		hostPlaceholder?: string;
		labelProtocol?: string;
		labelHost?: string;
		labelPort?: string;
		error?: boolean;
	}

	let {
		value = $bindable(''),
		protocols,
		defaultProtocol = protocols[0].scheme,
		fixedPort = undefined,
		portMin = 1,
		portMax = 65535,
		id = 'uri',
		hostPlaceholder = 'Hostname or IP',
		labelProtocol = 'Protocol',
		labelHost = 'Host',
		labelPort = 'Port',
		error = $bindable(false)
	}: Props = $props();

	const singleProtocol = protocols.length === 1;
	const hostRegex = /^((?:[a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+|(?:\d{1,3}\.){3}\d{1,3})$/;
	const schemes = protocols.map((p) => p.scheme);
	const defaultPortFor = (s: string): number =>
		protocols.find((p) => p.scheme === s)?.defaultPort ?? portMin;
	const parseRegex = new RegExp(`^(${schemes.join('|')})://([^:/?#]+)(?::(\\d+))?$`);

	let scheme = $state(defaultProtocol);
	let host = $state('');
	let port = $state<number>(fixedPort ?? defaultPortFor(defaultProtocol));
	let errorMessage = $state('');
	let writingValue = false;

	// Parse external value changes (and initial load from REST)
	$effect(() => {
		if (writingValue) {
			writingValue = false;
			return;
		}
		const v = value;
		if (!v) return;
		const m = v.match(parseRegex);
		if (m) {
			scheme = m[1];
			host = m[2];
			if (fixedPort === undefined) {
				port = m[3] ? Number(m[3]) : defaultPortFor(m[1]);
			}
		}
	});

	function validate(): string {
		if (!schemes.includes(scheme)) return 'Invalid protocol';
		if (!host || !hostRegex.test(host)) return 'Host must be a valid hostname or IPv4 address';
		if (fixedPort === undefined) {
			const p = Number(port);
			if (!Number.isInteger(p) || p < portMin || p > portMax)
				return `Port must be between ${portMin} and ${portMax}`;
		}
		return '';
	}

	// Validate and write back to value when local fields change
	$effect(() => {
		const assembled = `${scheme}://${host}:${fixedPort ?? port}`;
		const err = validate();
		errorMessage = err;
		error = !!err;
		if (!err && assembled !== value) {
			writingValue = true;
			value = assembled;
		}
	});

	function onSchemeChange(e: Event) {
		const newScheme = (e.currentTarget as HTMLSelectElement).value;
		if (fixedPort === undefined) {
			const oldDefault = defaultPortFor(scheme);
			if (Number(port) === oldDefault) port = defaultPortFor(newScheme);
		}
		scheme = newScheme;
	}

	// Grid columns: only include protocol col when interactive, port cols when variable
	// All four strings must be complete literals for Tailwind JIT to pick them up:
	// 'grid-cols-[auto_1fr_auto_auto]'  'grid-cols-[auto_1fr]'
	// 'grid-cols-[1fr_auto_auto]'       'grid-cols-1'
	const gridCols = $derived(
		!singleProtocol && fixedPort === undefined
			? 'grid-cols-[auto_1fr_auto_auto]'
			: !singleProtocol
				? 'grid-cols-[auto_1fr]'
				: fixedPort === undefined
					? 'grid-cols-[1fr_auto_auto]'
					: 'grid-cols-1'
	);
	const hostCol = $derived(!singleProtocol ? 'col-start-2' : 'col-start-1');
	const colonCol = $derived(!singleProtocol ? 'col-start-3' : 'col-start-2');
	const portCol = $derived(!singleProtocol ? 'col-start-4' : 'col-start-3');

	let schemeInvalid = $derived(!schemes.includes(scheme));
	let hostInvalid = $derived(!host || !hostRegex.test(host));
	let portInvalid = $derived(
		fixedPort === undefined &&
			(!Number.isInteger(Number(port)) || Number(port) < portMin || Number(port) > portMax)
	);
</script>

<div>
	<div class="grid w-full {gridCols} gap-x-1">
		<!-- Label row -->
		{#if !singleProtocol}
			<label class="label col-start-1 row-start-1 py-0" for="{id}-scheme">{labelProtocol}</label>
		{/if}
		<label class="label {hostCol} row-start-1 py-0" for={id}>{labelHost}</label>
		{#if fixedPort === undefined}
			<label class="label {portCol} row-start-1 py-0" for="{id}-port">{labelPort}</label>
		{/if}

		<!-- Field row -->
		{#if !singleProtocol}
			<select
				class="select col-start-1 row-start-2 w-auto shrink-0 ps-3 pe-6 {schemeInvalid
					? 'border-error border-2'
					: ''}"
				id="{id}-scheme"
				value={scheme}
				oninput={onSchemeChange}
			>
				{#each protocols as p}
					<option value={p.scheme}>{p.scheme}://</option>
				{/each}
			</select>
		{/if}

		<!-- Host: daisyUI label-as-input wrapper with optional fixed prefix/suffix inside -->
		<label
			class="input {hostCol} row-start-2 w-full min-w-0 {hostInvalid
				? 'border-error border-2'
				: ''}"
			for={id}
		>
			{#if singleProtocol}
				<span class="text-base-content/60 select-none">{protocols[0].scheme}://</span>
			{/if}
			<input
				type="text"
				class="min-w-0 grow"
				{id}
				bind:value={host}
				placeholder={hostPlaceholder}
				required
			/>
			{#if fixedPort !== undefined}
				<span class="text-base-content/60 select-none">:{fixedPort}</span>
			{/if}
		</label>

		{#if fixedPort === undefined}
			<span class="text-base-content/60 {colonCol} row-start-2 flex items-center select-none"
				>:</span
			>
			<input
				type="number"
				class="input {portCol} row-start-2 w-20 shrink-0 {portInvalid
					? 'border-error border-2'
					: ''}"
				id="{id}-port"
				bind:value={port}
				min={portMin}
				max={portMax}
				step="1"
				required
			/>
		{/if}
	</div>
	<label for={id}>
		<span class="text-error {errorMessage ? '' : 'hidden'}">{errorMessage}</span>
	</label>
</div>
