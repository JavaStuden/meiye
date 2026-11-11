package com.meiye.live.config;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

@Configuration
public class SecurityConfig {
    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    @Bean UserDetailsService users(MeiyeProperties properties, PasswordEncoder encoder) {
        String password = properties.adminPassword();
        if (password == null || password.isBlank()) {
            password = UUID.randomUUID().toString();
            log.warn("Local admin temporary password (changes on restart): {}. Set MEIYE_ADMIN_PASSWORD for a stable password.", password);
        }
        return new InMemoryUserDetailsManager(User.withUsername(properties.adminUsername()).password(encoder.encode(password)).roles("ADMIN").build());
    }
    @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(auth -> auth
                .requestMatchers("/admin", "/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/admin/**", "/meiye/api/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/miniprogram/rooms/*/messages", "/meiye/api/miniprogram/rooms/*/messages").permitAll()
                .requestMatchers(HttpMethod.GET, "/", "/meiye", "/meiye/", "/meiye/**", "/rooms/**", "/share/**", "/api/rooms/**", "/api/orders/**", "/assets/**", "/media/**", "/login", "/error", "/*.css", "/*.js", "/*.png", "/*.mp4", "/*.svg", "/index.html").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/rooms/**").permitAll()
                .anyRequest().authenticated())
            .csrf(csrf -> csrf.ignoringRequestMatchers(
                new AntPathRequestMatcher("/api/miniprogram/rooms/*/messages", "POST"),
                new AntPathRequestMatcher("/meiye/api/miniprogram/rooms/*/messages", "POST")))
            .formLogin(form -> form.loginPage("/login").defaultSuccessUrl("/admin", true).permitAll())
            .logout(logout -> logout.logoutSuccessUrl("/login?logout"))
            .headers(headers -> headers.contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' https: http: data: blob:; media-src 'self' https: http: blob: data:; connect-src 'self' https: http:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'")))
            .build();
    }
}
