/**
 * ResolveRejectFunction type definition
 */
export type ResolveRejectFunction<T = any> = (...args: T[]) => any;

/**
 * DeferredPromise interface definition
 */
export interface DeferredPromise<T = any> extends Promise<T> {
	resolve: ResolveRejectFunction<T>;
	reject: ResolveRejectFunction<T>;
}
/**
 * deferrer function creates a deferred promise with optional resolve and reject callbacks
 * @param onResolve Optional resolve callback
 * @param onReject Optional reject callback
 * @returns A DeferredPromise
 */
export function deferrer<T = any>(
	onResolve?: ResolveRejectFunction<T>,
	onReject?: ResolveRejectFunction<T>
): DeferredPromise<T> {
	let resolve: ResolveRejectFunction<T> = () => {
		throw new Error("Promise not yet created");
	};
	let reject: ResolveRejectFunction<T> = () => {
		throw new Error("Promise not yet created");
	};

	const promise: Promise<T> = new Promise<T>((myResolve: ResolveRejectFunction, myReject: ResolveRejectFunction) => {
		resolve = (...args: T[]) => {
			if (typeof onResolve === "function") {
				onResolve(...args);
			}
			myResolve(...args);
		};

		reject = (...args: T[]) => {
			if (typeof onReject === "function") {
				onReject(...args);
			}
			myReject(...args);
		};
	});

	return Object.assign(promise, { resolve, reject }) as DeferredPromise<T>;
}