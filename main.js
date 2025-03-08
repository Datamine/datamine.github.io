// Google Analytics integration
(function(i,s,o,g,r,a,m){i["GoogleAnalyticsObject"]=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,"script","//www.google-analytics.com/analytics.js","ga");
ga("create", "UA-74324013-1", "auto");
ga("send", "pageview");

// Image rotation functionality
document.addEventListener('DOMContentLoaded', function() {
  const images = [
    'images/beach.jpg',
    'images/self2.jpg',
    'images/self.jpg',
    'images/twitter-img.jpg'
  ];

  let currentIndex = 0;
  const profileImg = document.querySelector('.float-right img');

  if (profileImg) {
    // Set initial image
    profileImg.src = images[currentIndex];

    // Set up click handler for the image
    profileImg.addEventListener('click', function() {
      currentIndex = (currentIndex + 1) % images.length;
      profileImg.src = images[currentIndex];
    });

    // Change the cursor to indicate it's clickable
    profileImg.style.cursor = 'pointer';
  }
});
