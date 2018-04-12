$(document).ready(function() {
	console.log("book-search.js connected");

	let termSearch = document.getElementById("search");
	termSearch.addEventListener("submit", (evt) => {
		evt.preventDefault();
		
		while(document.getElementsByClassName("book-selection")[0]){
			document.getElementsByClassName("book-selection")[0].remove();
		}

		let searchInput = document.getElementById("search-input");
		let term = searchInput.value;
		$.get(`/find-book/${term}`, (data) => {
			let bookCon = document.getElementById("title-modal");
			bookCon.style.display = "flex";
			data.forEach((item) => {
				let html = document.createElement("div");
				html.setAttribute("class", "book-selection");
				let titles = `<p><a href="#" class="title-link">${item.title}</a></p>`;
				html.innerHTML = titles;
				bookCon.append(html);
			});
			searchInput.value = "";

			if(document.getElementsByClassName("title-link")) {
				let titleColl = document.getElementsByClassName("title-link");

				Array.prototype.forEach.call(titleColl, function(ttl, index, ar) {
					ttl.addEventListener("click", function(evt) {
						evt.preventDefault();
						
						$.ajax({
							type: "POST",
							dataType: "json",
							data: data[index],
							url: "/create-book",
							success: function(data) {
								console.log("post success");
								console.log("data: ", data);
								console.log(JSON.stringify(data));
							},
							error: function(error) {
								console.log("error: ", error);
							}
						});
						let bookCon = document.getElementById("title-modal");
						while(document.getElementsByClassName("book-selection")[0]){
							document.getElementsByClassName("book-selection")[0].remove();
						}
						bookCon.style.display = "none";
						location.reload();
					});
				});
			}


		}, false);

	});

	if(document.getElementById("close-btn")) {
		let closeBtn = document.getElementById("close-btn");
		closeBtn.addEventListener("click", (evt) => {
			evt.preventDefault();
			let bookCon = document.getElementById("title-modal");
			console.log(closeBtn.parentElement);
			while(document.getElementsByClassName("book-selection")[0]){
				document.getElementsByClassName("book-selection")[0].remove();
			}
			closeBtn.parentElement.parentElement.style.display = "none";

		});
	}

	//Prevent click on book-delete button from bubbling up but still allow form to submit 
	console.log(document.getElementById("del-btn"));
	document.getElementById("del-btn").addEventListener("click", (e) => {
		console.log("checking preventDefault for delete book btn");
		e.stopPropagation();
	});

	let accept = document.getElementsByClassName("bool-btn");
	let acceptArray = Array.from(accept);
	console.log(accept);
	acceptArray.forEach((el, index) => {
		el.addEventListener("click", (e) => {
				e.stopPropagation();
		});
	});

}); //document