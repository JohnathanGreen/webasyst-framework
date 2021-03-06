$.wa_blog = $.extend(true, $.wa_blog, {
	plugins_import : {
		options : {
			loader : '<i class="b-ajax-status-loading icon16 loading"></i>'
		},
		progress: false,
		form : null,
		ajax_pull : {},
		ajaxInit : function() {
			var self = this;
			self.form = $('#plugin-import-form');
			var selector = $(':input[name="blog_import_transport"]').bind(
					'change.plugins_import',
					function(eventObject) {
						return self.settingsHandler
								.apply(self, [this, eventObject]);
					});
			self.form.submit(function(eventObject) {
				return self.importHandler.apply(self, [this, eventObject]);
			});
			selector.trigger('change');
			$(window).bind('unload.plugins_import', function () {
				return self.checkProgress();
			});
			$("#wa-app > div.sidebar a, #wa-header a, #plugin-list a").live('click.plugins_import', function () {
				return self.checkProgress();
			});

		},
		ajaxPurge : function()
		{
			$(window).unbind('.plugins_import');
			$("#wa-app > div.sidebar a, #wa-header a, #plugin-list a").die('.plugins_import');
		},
		settingsTooggle : function(display) {
			var self = this;
			if (display) {
				self.form.find('.js-runtime-settings').show();
				self.form.find(':submit').attr('disabled', false).show();
			} else {
				self.form.find('.js-runtime-settings').hide();
				self.form.find(':submit').attr('disabled', true).hide();
			}
		},
		settingsHandler : function(element) {
			var self = this;
			var selector = $('#wa-blog-import-settings');
			var item = $('#wa-blog-import-runtime-settings');
			item.empty();
			self.settingsTooggle(false);
			var transport = $(element).val();
			if(transport) {
				$(element).after(this.options.loader);
				$('.plugin-import-transport-description:visible').hide();
				$('#plugin-import-transport-' + transport).show();
				$.ajax({
					url : '?plugin=import&action=setup',
					type : 'POST',
					data : {
						'transport' : transport
					},
					success : function(response) {
						selector.find('.b-ajax-status-loading').remove();
						if (response.status == 'ok') {
							for (field in response.data) {
								item.append(response.data[field]);
							}
							self.settingsTooggle(true);
						} else {
							self.settingsTooggle(false);
							//
						}
					},
					error : function(jqXHR, textStatus, errorThrown) {
						selector.find('.b-ajax-status-loading').remove();
						self.settingsTooggle(false);
					},
					dataType : 'json'
				});
			} else {
				$('.plugin-import-transport-description:visible').hide();
			}
			return false;
		},
		importHandler : function(element) {
			var self = this;
			self.progress = true;
			self.form = $(element);
			var data = self.form.serialize();
			self.form.find(':input').attr('disabled', true);
			self.form.find(':submit').after(this.options.loader);
			self.form.find('.errormsg').text('');

			var url = $(element).attr('action');
			$.ajax({
				url : url,
				data : data,
				dataType : 'json',
				type : 'post',
				success : function(response) {
					if(response.error) {
						self.form.find(':input').attr('disabled', false);
						self.form.find(':submit').show();
						self.form.find('.b-ajax-status-loading').remove();
						self.form.find('.js-progressbar-container').hide();
						self.progress = false;
						self.form.find('.errormsg').text(response.error);
					} else {
						self.form.find('.b-ajax-status-loading').remove();
						self.form.find(':submit').hide();
						self.form.find('.progressbar .progressbar-inner').css('width','0%');

						self.form.find('.progressbar').attr('title', '0.00%');
						self.form.find('.progressbar-description').text('0.00%');
						self.form.find('.js-progressbar-container').show();

						self.ajax_pull[response.processId] = new Array();
						self.ajax_pull[response.processId]
								.push(setTimeout(
										function() {
											$.wa.errorHandler = function(xhr) {
												if ((xhr.status >= 500) || (xhr.status == 0)) {
													return false;
												}
												return true;
											};
											self.progressHandler(url, response.processId,
													response);
										}, 100));
						self.ajax_pull[response.processId].push(setTimeout(
								function() {
									self.progressHandler(url, response.processId);
								}, 2000));
					}
				},
				error : function(jqXHR, textStatus, errorThrown) {
					self.form.find(':input').attr('disabled', false);
					self.form.find(':submit').show();
					self.form.find('.b-ajax-status-loading').remove();
					self.form.find('.js-progressbar-container').hide();
					self.progress = false;
				}
			});
			return false;
		},
		updateHandler : function() {

		},
		checkProgress : function() {
			return !this.progress || confirm($_("If you leave this page now, the import process is likely to be interrupted. Leave the page?"));
		},
		progressHandler : function(url, processId, response) {
			// display progress
			// if not completed do next iteration
			var self = $.wa_blog.plugins_import;

			if (response && response.ready) {
				$.wa.errorHandler = null;
				while (timer = self.ajax_pull[processId].pop()) {
					if (timer) {
						clearTimeout(timer);
					}
				}
				self.form.find(':input').attr('disabled', false);
				self.form.find(':submit').show();
				self.form.find('.b-ajax-status-loading').remove();
				self.form.find('.progressbar').hide();
				self.form.find('.js-progressbar-container').hide();
				self.progress = false;
				$.ajax({
					url : url,
					data : {
						'processId' : response.processId,
						'cleanup' : 1
					},
					dataType : 'json',
					type : 'post',
					success : function(response) {
						if (response.blog) {
							location.href = '?blog=' + response.blog;
						} else {
							location.href = '?';
						}
					},
				});

			} else {
				if (response) {
					var bar = self.form.find('.progressbar .progressbar-inner');
					bar.css('width', response.progress.replace(/,/, '.'));
					bar.parents('.progressbar').attr('title', response.progress);
					self.form.find('.progressbar-description').text(response.progress);
				}
				var ajax_url = url;
				var id = processId;
				self.ajax_pull[id].push(setTimeout(function() {
					$.ajax({
						url : ajax_url,
						data : {
							'processId' : id
						},
						dataType : 'json',
						type : 'post',
						success : function(response) {
							self.progressHandler(url, response
									? response.processId
									: id, response);
						},
						error : function(jqXHR, textStatus, errorThrown) {
							self.progressHandler(url, id, null);
						}
					});
				}, 3000));
			}
		}

	}
});
