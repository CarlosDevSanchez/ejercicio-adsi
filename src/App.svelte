<script>
	import { db } from './firebase';

	let task = {
		id: '',
		name: '',
		description: ''
	}

	let inputElement;

	let newTask = [];
	db.collection('task')
	.orderBy('date', 'asc')
	.onSnapshot((query) => {
		let docs = [];
		query.forEach(doc => {
			docs.push({ ...doc.data(), id: doc.id });
		});
		newTask = [...docs];
	})

	const handlerSubmit = async () => {
		if(task.id.length){
			try{
				await db
					.collection('task')
					.doc(task.id)
					.update({name: task.name, description: task.description});
			}catch(e){
				console.log(e)
			}
		}else{
			try{
				await db
					.collection('task')
					.doc()
					.set({ ...task, date: new Date() });
			}catch(e){
				console.log(e)
			}
		}
		task = {id: '', name: '', description: ''};
	}

	const handlerDelete = async (currentId) => {
		await db.collection('task').doc(currentId).delete();
	}

	const handlerUpdate = (data) => {
		task = {...data};
	}
	const handlerCancel = () => {
		task = {
			id: '',
			name: '',
			description: ''
		};
	}
</script>

<div class="container">
	<div class="row">
		<div class="col-6">
			<form on:submit|preventDefault={handlerSubmit} class="card card-body">
				<div>
					<input 
						type="text"
						bind:value={task.name}
						bind:this={inputElement}
						class="form-control mb-2"
						placeholder='titulo' />
				</div>
				<div>
					<textarea 
						bind:value={task.description} 
						placeholder='description' 
						class="form-control mb-2"
						rows="3" />
				</div>
				<button type='submit' class='btn btn-primary mb-2'>{#if !task.id.length} Guardar {:else} Actualizar {/if}</button>
				{#if task.id}<button on:click={handlerCancel} class="btn btn-danger">Cancelar</button>{/if}
			</form>

			{#each newTask as task}
				<div class="mt-4 card card-body">
					<h3 class="card-title">{task.name}</h3>
					<p class="card-text">{task.description}</p>
					<button class="btn btn-danger mb-2" on:click={handlerDelete(task.id)}>eliminar</button>
					<button class="btn btn-primary" on:click={handlerUpdate(task)}>actualizar</button>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>

</style>