$('form#clear').bind('ajax:success', function() {
  $(this).find('input[type=submit]').attr('disabled', true).val('Cleared');
});
