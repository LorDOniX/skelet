onix.factory("$job", [
	"$promise",
function(
	$promise
) {
	/**
	 * Factory for manage multiple tasks.
	 * 
	 * @class $job
	 */
	class $job {
		constructor() {
			this._isRunning = false;
			this._tasks = [];
			this._taskDone = {
				cb: null,
				scope: null
			};
		}

		/**
		 * Add task to job. Every job task needs to call doneFn(), which is added to the last argument position.
		 * 
		 * @param {Function} task Job function
		 * @param {Function|Object} [scope] Variable function scope
		 * @param {Object} [args] Add params to the function
		 * @member $job
		 * @method add
		 */
		add(task, scope, args) {
			args = args || [];

			if (!Array.isArray(args)) {
				args = [args];
			}

			this._tasks.push({
				task: task,
				scope: scope,
				args: args
			});
		}

		/**
		 * Start job.
		 *
		 * @return {$promise} Returns promise for whole job
		 * @member $job
		 * @method start
		 */
		start() {
			return new $promise((resolve, reject) => {
				if (this._isRunning || !this._tasks.length) {
					reject();

					return;
				}

				// job is running
				this._isRunning = true;

				// because of pop
				this._tasks.reverse();

				this._doJob(resolve);
			});
		}

		/**
		 * Clear all job taks.
		 *
		 * @member $job
		 * @method clear
		 */
		clear() {
			this._tasks = [];
		}

		/**
		 * Set progress function, which will be called after each task will be done.
		 * 
		 * @param {Function} cb
		 * @param {Function|Object} [scope]
		 * @member $job
		 * @method setTaskDone
		 */
		setTaskDone(cb, scope) {
			this._taskDone.cb = cb;
			this._taskDone.scope = scope;
		};

		/**
		 * Internal function for running job queue.
		 *
		 * @param {Function} resolve Promise object
		 * @member $job
		 * @method _doJob
		 */
		_doJob(resolve) {
			let rest = this._tasks.length;

			if (rest == 0) {
				this._isRunning = false;
				
				resolve();
			}
			else {
				let job = this._tasks.pop();

				job.task.apply(job.scope || job.task, job.args.concat(function() {
					if (this._taskDone.cb) {
						let doneFnArgs = Array.prototype.slice.call(arguments, 0);

						this._taskDone.cb.apply(this._taskDone.scope || this._taskDone.cb, doneFnArgs);
					}

					this._doJob(resolve);
				}.bind(this)));
			}
		}
	};

	return {
		/**
		 * Factory for creating new job.
		 *
		 * @member $job
		 * @method create
		 */
		create: function() {
			return new $job();
		},

		/**
		 * Run jobs array with count for how many functions will be processed simultinously.
		 *
		 * @param  {Object[]} jobsArray Array with jobs objects
		 * @param  {Function} jobsArray.task Job function
		 * @param  {Function} [jobsArray.scope] Variable function scope
		 * @param  {Function} [jobsArray.args] Add params to the function
		 * @param  {Number} count How many functions processed simultinously
		 * @param  {Object} taskDoneObj Callback after one task have been done
		 * @param  {Object} taskDoneObj.cb Function
		 * @param  {Object} [taskDoneObj.scope] Function scope
		 * @return {$promise} Callback after all jobs are done
		 * @member $job
		 * @method multipleJobs
		 */
		multipleJobs: function(jobsArray, count, taskDoneObj) {
			let len = jobsArray.length;
			let jobs = [];

			for (let i = 0; i < len; i++) {
				let jp = count > 0 ? i % count : i;
				let jobItem = jobsArray[i];

				if (!jobs[jp]) {
					jobs[jp] = this.create();

					if (taskDoneObj) {
						jobs[jp].setTaskDone(taskDoneObj.cb, taskDoneObj.scope);
					}
				}

				// add one job
				jobs[jp].add(jobItem.task, jobItem.scope, jobItem.args);
			}

			let jobPromises = [];

			jobs.forEach(job => {
				jobPromises.push(job.start());
			});

			return $promise.all(jobPromises);
		}
	};
}]);
