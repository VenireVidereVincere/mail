document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);
  
  // Catch the form submission event, prevent default submission, call local function instead.
  document.querySelector('#compose-form').addEventListener('submit', function (e) {
    e.preventDefault()
    send_email()
  })

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email() {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  document.querySelector('#individual-email-view').style.display = 'none';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
}

function load_mailbox(mailbox) {
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#individual-email-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  const emailsDiv = document.querySelector('#emails-view')
  // Fetch emails list from the server  
  fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(emails => {
      emails.forEach(email => {
        // Pass each individual email + the parent div reference
        // We also pass the mailbox to later determine whether some buttons show or not
        add_email(email, emailsDiv, mailbox)
      })
    })  
}

function add_email(contents, parent, originMailbox) {
 
  // Create the 3 p tags with the sender, subject and time and date
  // Also, styling each <p>.. Flexbox with some margins and space-between for the main div
  const sender = document.createElement('p')
  sender.innerHTML = contents.sender
  sender.style.margin = 'auto 0'
  sender.style.paddingLeft = '5px'
  sender.style.fontWeight = 'bold'

  const subject = document.createElement('p')
  subject.innerHTML = contents.subject
  subject.style.margin = 'auto 0'
  subject.style.paddingLeft = '12px'

  const dateTime = document.createElement('p')
  dateTime.innerHTML = contents.timestamp
  dateTime.style.margin = 'auto 0 auto auto'  
  dateTime.style.paddingRight = '5px'

  // Create the containing div for each email
  const div = document.createElement('div')
  // Styling the div
  if (contents.read) {
    div.style.backgroundColor = '#D3D3D3'
  } else {
    div.style.backgroundColor = 'white'
  }
  div.style.display = 'flex'
  div.style.justifyContent = 'space-between'
  div.style.border = "1px solid black"
  div.style.height = '36px'
  div.style.cursor = 'pointer'
  div.style.borderRadius = '8px'

  // Adding onclick to the div in order to view the individual email.
  div.addEventListener('click', function () { 
    // We pass the email contents to display them, and the mailbox the request was originated from
    // in order to determine whether some buttons have to be displayed
    get_email(contents.id, originMailbox)
  })
  // Append every inidividual <p> to the div, then append the div to the parent in the template
  div.append(sender, subject, dateTime)
  parent.append(div)    
}

function send_email() {
  const recipients = document.querySelector('#compose-recipients').value;
  const subject = document.querySelector('#compose-subject').value;
  const body = document.querySelector('#compose-body').value;
  // Sending request to server
  fetch('/emails',{
    method: "post",
    body: JSON.stringify({
      body,
      subject,
      recipients
    })
  })
    .then(response => response.json())
    .then(result => {
      if ("error" in result) {
        // Displaying error message to user in case we receive an error from server
        alert("You must select at least 1 valid recipient!\n" + result.error)
      } else {
        load_mailbox(sent)
      }
      
    })
}

function get_email(id, originMailbox) {
  // Cleanup any child elements there might be from previous emails seen
  const parent = document.querySelector('#individual-email-view')
  if (parent.firstChild) {
    parent.removeChild(parent.firstChild)
  }  
  // Attempt to retrieve the email from the DB, if it doesn't exist alert the user
  fetch(`/emails/${id}`, {
    method: 'get'
  })
    .then(response => response.json())
    .then(email => {
      if ('error' in email) {
        alert("The email you requested doesn't exist!\n" + email.error)
        return load_mailbox('inbox')
      }
      fetch(`/emails/${email.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          read: true
        })
      })
      
      // Hide the emails and compose views and show the individual email view
      document.querySelector('#emails-view').style.display = 'none';
      document.querySelector('#compose-view').style.display = 'none';
      parent.style.display = 'block';

      // Create the individual elements for the email view and append them to the parent div
      // Adding stylings too
      const from = document.createElement('div')
      from.innerHTML = `<b>From: </b> ${email.sender}`
      from.margin = '0'

      const to = document.createElement('div')
      to.innerHTML = `<b>To:</b> ${email.recipients}`

      const subject = document.createElement('div')
      subject.innerHTML = `<b>Subject:</b> ${email.subject}`
      
      const timestamp = document.createElement('div')
      timestamp.innerHTML = `<b>Timestamp:</b> ${email.timestamp}`
      
      // Creating a div for both buttons to be displayed.
      const buttons = document.createElement('div')
      buttons.style.display = 'flex'

      const replyButton = document.createElement('button')
      replyButton.innerText = 'Reply'
      replyButton.style.marginBottom = '16px'
      replyButton.classList.add('btn', 'btn-sm', 'btn-outline-primary')
      replyButton.addEventListener('click', function () {
        reply_email(email)
      })
      
      buttons.append(replyButton)

      // Display the archived button in case we opened the email from the inbox view
      if (originMailbox === 'inbox' && !email.archived) {
        const archiveButton = document.createElement('button')
        archiveButton.innerText = 'Archive'
        archiveButton.style.marginBottom = '16px'
        archiveButton.classList.add('btn', 'btn-sm', 'btn-outline-primary')
        buttons.append(archiveButton)
        archiveButton.addEventListener('click', function () {
          flipArchiveStatus(email.id, email.archived)
        })
      }

      // Display the Unarchive button in case the email is archived
      if (email.archived) {
        const archiveButton = document.createElement('button')
        archiveButton.innerText = 'Unarchive'
        archiveButton.style.marginBottom = '16px'
        archiveButton.classList.add('btn', 'btn-sm', 'btn-outline-primary')
        buttons.append(archiveButton)
        archiveButton.addEventListener('click', function () {
          flipArchiveStatus(email.id, email.archived)
        })
      }      

      const body = document.createElement('p')
      body.innerHTML = email.body
      
      // Appending everything as part of the same div to ease up cleanup.
      const emailDiv = document.createElement('div')
      emailDiv.append(from, to, subject, timestamp, buttons, body)
      parent.append(emailDiv)
    })
}

function flipArchiveStatus(emailId, currentArchivedStatus) {
  fetch(`/emails/${emailId}`,{
    method: 'PUT',
    body: JSON.stringify({
      archived: !currentArchivedStatus
    })
  })
    .then(() => {
      load_mailbox("inbox")
    })
}

function reply_email(email) {
  compose_email();
  document.querySelector('#compose-recipients').value = email.sender;
  document.querySelector('#compose-subject').value =
      email.subject.slice(0,3)==="Re:" ? email.subject : "Re: " + email.subject ;
  const pre_body_text = `\n \n \n------ On ${email.timestamp} ${email.sender} wrote: \n \n`;
  document.querySelector('#compose-body').value = pre_body_text + email.body.replace(/^/gm, "\t");
}