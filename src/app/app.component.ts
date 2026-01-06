import { AfterViewInit, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'concussion_recovery';

  ngAfterViewInit(): void {
    // Load Buy Me a Coffee button script once and render it into our footer container.
    const existing = document.querySelector(
      'script[src="https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js"]'
    );
    if (existing) return;

    const container = document.getElementById('bmc-button-container');
    if (!container) return;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js';

    script.setAttribute('data-name', 'bmc-button');
    script.setAttribute('data-slug', 'streetalext');
    script.setAttribute('data-color', '#FFDD00');
    script.setAttribute('data-emoji', '');
    script.setAttribute('data-font', 'Cookie');
    script.setAttribute('data-text', 'Buy me a coffee');
    script.setAttribute('data-outline-color', '#000000');
    script.setAttribute('data-font-color', '#000000');
    script.setAttribute('data-coffee-color', '#ffffff');

    container.appendChild(script);
  }
}
